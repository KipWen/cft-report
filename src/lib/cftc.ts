import { ContractConfig } from './contracts';
import { InstrumentRow, PriceInfo } from './types';

const CFTC_TFF_URL = 'https://publicreporting.cftc.gov/resource/gpe5-46if.json';
const CFTC_DISAGG_URL = 'https://publicreporting.cftc.gov/resource/72hh-3qpy.json';
const LOOKBACK_DAYS = 1200;
const ZSCORE_WINDOW = 156;

interface CftcRow {
  market_and_exchange_names: string;
  report_date_as_yyyy_mm_dd: string;
  report_date: string;
  open_interest_all: number;
  cftc_contract_market_code?: string;
  // TFF fields
  lev_money_positions_long?: number;
  lev_money_positions_short?: number;
  // Disagg fields
  m_money_positions_long_all?: number;
  m_money_positions_short_all?: number;
  [key: string]: unknown;
}

const SKIP_COLS = new Set([
  'market_and_exchange_names', 'report_date_as_yyyy_mm_dd',
  'cftc_contract_market_code', 'cftc_market_code', 'cftc_commodity_code',
  'cftc_region_code', 'cftc_subgroup_code', 'contract_market_name',
  'contract_units', 'futonly_or_combined', 'id', 'commodity',
  'commodity_group_name', 'commodity_name', 'commodity_subgroup_name',
  'report_date_as_mm_dd_yyyy', 'yyyy_report_week_ww',
]);

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchCftc(endpoint: string, startDate: string): Promise<CftcRow[]> {
  const params = new URLSearchParams({
    '$where': `report_date_as_yyyy_mm_dd >= '${startDate}'`,
    '$limit': '50000',
    '$order': 'report_date_as_yyyy_mm_dd ASC',
  });

  let data: Record<string, unknown>[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(`${endpoint}?${params}`, {
        signal: AbortSignal.timeout(120000),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      data = await resp.json();
      break;
    } catch (e) {
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 3000));
      } else {
        throw e;
      }
    }
  }

  if (!data.length) return [];

  return data.map(row => {
    const parsed: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(row)) {
      if (SKIP_COLS.has(key)) {
        parsed[key] = val;
      } else {
        const num = Number(val);
        parsed[key] = isNaN(num) ? val : num;
      }
    }
    parsed['report_date'] = parsed['report_date_as_yyyy_mm_dd'] as string;
    return parsed as unknown as CftcRow;
  });
}

function matchCftc(rows: CftcRow[], searchPattern: string): CftcRow[] | null {
  const patternUpper = searchPattern.toUpperCase();

  let matched = rows.filter(r =>
    r.market_and_exchange_names.toUpperCase() === patternUpper
  );
  if (!matched.length) {
    matched = rows.filter(r =>
      r.market_and_exchange_names.toUpperCase().startsWith(patternUpper)
    );
  }
  if (!matched.length) {
    matched = rows.filter(r =>
      r.market_and_exchange_names.toUpperCase().includes(patternUpper)
    );
  }
  if (!matched.length) return null;

  // Pick consolidated or highest OI name
  const uniqueNames = [...new Set(matched.map(r => r.market_and_exchange_names))];
  if (uniqueNames.length > 1) {
    const consolidated = uniqueNames.find(n => n.includes('Consolidated'));
    if (consolidated) {
      matched = matched.filter(r => r.market_and_exchange_names === consolidated);
    } else {
      const avgOi = new Map<string, number>();
      for (const name of uniqueNames) {
        const subset = matched.filter(r => r.market_and_exchange_names === name);
        const avg = subset.reduce((s, r) => s + (r.open_interest_all || 0), 0) / subset.length;
        avgOi.set(name, avg);
      }
      const best = [...avgOi.entries()].sort((a, b) => b[1] - a[1])[0][0];
      matched = matched.filter(r => r.market_and_exchange_names === best);
    }
  }

  // Deduplicate sub-contracts
  const codes = [...new Set(matched.map(r => r.cftc_contract_market_code).filter(Boolean))];
  if (codes.length > 1) {
    const avgOi = new Map<string, number>();
    for (const code of codes) {
      const subset = matched.filter(r => r.cftc_contract_market_code === code);
      const avg = subset.reduce((s, r) => s + (r.open_interest_all || 0), 0) / subset.length;
      avgOi.set(code!, avg);
    }
    const best = [...avgOi.entries()].sort((a, b) => b[1] - a[1])[0][0];
    matched = matched.filter(r => r.cftc_contract_market_code === best);
  }

  return matched.sort((a, b) => a.report_date.localeCompare(b.report_date));
}

// ============================================================================
// PROCESSING
// ============================================================================

function calcZscore(values: number[], window = ZSCORE_WINDOW): number | null {
  const clean = values.filter(v => v != null && !isNaN(v));
  if (clean.length < 10) return null;
  const tail = clean.slice(-window);
  const mean = tail.reduce((s, v) => s + v, 0) / tail.length;
  const std = Math.sqrt(tail.reduce((s, v) => s + (v - mean) ** 2, 0) / tail.length);
  if (std === 0) return 0;
  return Math.round(((clean[clean.length - 1] - mean) / std) * 10) / 10;
}

function calcChangeZscore(values: number[], window = ZSCORE_WINDOW): number | null {
  const clean = values.filter(v => v != null && !isNaN(v));
  if (clean.length < 11) return null;
  const changes: number[] = [];
  for (let i = 1; i < clean.length; i++) {
    changes.push(clean[i] - clean[i - 1]);
  }
  const tail = changes.slice(-window);
  const mean = tail.reduce((s, v) => s + v, 0) / tail.length;
  const std = Math.sqrt(tail.reduce((s, v) => s + (v - mean) ** 2, 0) / tail.length);
  if (std === 0) return 0;
  return Math.round(((changes[changes.length - 1] - mean) / std) * 10) / 10;
}

function flowState(zDlong: number | null, zDshort: number | null): string {
  if (zDlong == null || zDshort == null) return '';
  const zl = zDlong, zs = zDshort;

  if (zl >= 0.8 && zs <= -0.8) return '多头挤压';
  if (zl <= -0.8 && zs >= 0.8) return '空头施压';
  if (zl >= 0.8 && zs >= 0.8) return '多空双增';
  if (zl <= -0.8 && zs <= -0.8) return '多空双减';
  if (zl >= 0.8 && Math.abs(zs) < 0.5) return '多头建仓';
  if (zs <= -0.8 && Math.abs(zl) < 0.5) return '空头回补';
  if (zs >= 0.8 && Math.abs(zl) < 0.5) return '空头建仓';
  if (zl <= -0.8 && Math.abs(zs) < 0.5) return '多头平仓';
  return '';
}

function posGroup(matched: CftcRow[], longCol: string, shortCol: string) {
  const longS = matched.map(r => (r[longCol] as number) || 0);
  const shortS = matched.map(r => (r[shortCol] as number) || 0);
  const netS = longS.map((l, i) => l - shortS[i]);
  const oi = matched.map(r => r.open_interest_all || 0);

  const longOi = longS.map((l, i) => oi[i] ? l / oi[i] : 0);
  const shortOi = shortS.map((s, i) => oi[i] ? s / oi[i] : 0);
  const netOi = netS.map((n, i) => oi[i] ? n / oi[i] : 0);

  const latestLong = longS[longS.length - 1];
  const latestShort = shortS[shortS.length - 1];

  const zDlong = calcChangeZscore(longS);
  const zDshort = calcChangeZscore(shortS);

  const netWw = netS.length > 1 ? netS[netS.length - 1] - netS[netS.length - 2] : 0;
  const longWw = longS.length > 1 ? longS[longS.length - 1] - longS[longS.length - 2] : 0;
  const shortWw = shortS.length > 1 ? shortS[shortS.length - 1] - shortS[shortS.length - 2] : 0;

  return {
    net: Math.round(latestLong - latestShort),
    net_z: calcZscore(netOi),
    net_ww: Math.round(netWw),
    net_ww_z: calcChangeZscore(netS),
    long: Math.round(latestLong),
    long_z: calcZscore(longOi),
    long_ww: Math.round(longWw),
    long_ww_z: zDlong,
    short: Math.round(latestShort),
    short_z: calcZscore(shortOi),
    short_ww: Math.round(shortWw),
    short_ww_z: zDshort,
    flow_state: flowState(zDlong, zDshort),
  };
}

// ============================================================================
// PRICE DATA (Yahoo Finance via unofficial API)
// ============================================================================

async function fetchYahooPrice(ticker: string, startDate: string, endDate: string): Promise<{ date: string; close: number }[]> {
  const period1 = Math.floor(new Date(startDate).getTime() / 1000);
  const period2 = Math.floor(new Date(endDate).getTime() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${period1}&period2=${period2}&interval=1d`;

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return [];
    const json = await resp.json();
    const result = json?.chart?.result?.[0];
    if (!result) return [];

    const timestamps: number[] = result.timestamp || [];
    const closes: number[] = result.indicators?.quote?.[0]?.close || [];

    return timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      close: closes[i],
    })).filter(d => d.close != null);
  } catch {
    return [];
  }
}

async function fetchTueTueReturns(
  contracts: ContractConfig[],
  cftcDate: string,
): Promise<Record<string, PriceInfo>> {
  const results: Record<string, PriceInfo> = {};
  const tueEnd = new Date(cftcDate);
  const tueStart = new Date(tueEnd.getTime() - 7 * 86400000);
  const fetchStart = new Date(tueStart.getTime() - 5 * 86400000).toISOString().slice(0, 10);
  const fetchEnd = new Date(tueEnd.getTime() + 3 * 86400000).toISOString().slice(0, 10);

  const tueEndStr = tueEnd.toISOString().slice(0, 10);
  const tueStartStr = tueStart.toISOString().slice(0, 10);

  const promises = contracts.filter(c => c.yf).map(async (c) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const data = await fetchYahooPrice(c.yf, fetchStart, fetchEnd);
        if (data.length < 2) return;

        const pxEnd = data.filter(d => d.date <= tueEndStr);
        const pxStart = data.filter(d => d.date <= tueStartStr);

        if (pxEnd.length && pxStart.length) {
          const p1 = pxStart[pxStart.length - 1].close;
          const p2 = pxEnd[pxEnd.length - 1].close;
          const ret = Math.round((p2 / p1 - 1) * 10000) / 100;
          results[c.name] = {
            ret,
            ticker: c.yf,
            date_start: pxStart[pxStart.length - 1].date.slice(5),
            date_end: pxEnd[pxEnd.length - 1].date.slice(5),
            px_start: p1,
            px_end: p2,
          };
        }
        return;
      } catch {
        if (attempt < 1) await new Promise(r => setTimeout(r, 2000));
      }
    }
  });

  await Promise.all(promises);
  return results;
}

// ============================================================================
// BUILD TABLES
// ============================================================================

function buildTable(
  rows: CftcRow[],
  contracts: ContractConfig[],
  longCol: string,
  shortCol: string,
  priceData: Record<string, PriceInfo>,
): InstrumentRow[] {
  const result: InstrumentRow[] = [];
  for (const c of contracts) {
    const matched = matchCftc(rows, c.cftc);
    if (!matched || !matched.length) continue;
    const pg = posGroup(matched, longCol, shortCol);
    const pd = priceData[c.name];
    result.push({
      ...pg,
      instrument: c.name,
      section: c.section,
      price_chg: pd ? pd.ret : null,
    });
  }
  return result;
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

export async function generateReport(targetDate?: string) {
  const startDate = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString().slice(0, 10);

  console.log('[1/4] Fetching CFTC TFF data...');
  let dfTff = await fetchCftc(CFTC_TFF_URL, startDate);
  console.log(`  -> ${dfTff.length} rows`);

  console.log('[2/4] Fetching CFTC Disagg data...');
  let dfDisagg = await fetchCftc(CFTC_DISAGG_URL, startDate);
  console.log(`  -> ${dfDisagg.length} rows`);

  if (targetDate) {
    dfTff = dfTff.filter(r => r.report_date <= targetDate);
    dfDisagg = dfDisagg.filter(r => r.report_date <= targetDate);
  }

  const reportDate = dfTff.length
    ? dfTff.reduce((max, r) => r.report_date > max ? r.report_date : max, dfTff[0].report_date).slice(0, 10)
    : 'N/A';
  console.log(`  Report date: ${reportDate}`);

  console.log('[3/4] Fetching price data...');
  const allContracts = [...(await import('./contracts')).TFF_CONTRACTS, ...(await import('./contracts')).DISAGG_CONTRACTS];
  const priceData = await fetchTueTueReturns(allContracts, reportDate);
  console.log(`  -> ${Object.keys(priceData).length} instruments`);

  console.log('[4/4] Building tables...');
  const tffRows = buildTable(dfTff, (await import('./contracts')).TFF_CONTRACTS, 'lev_money_positions_long', 'lev_money_positions_short', priceData);
  const disaggRows = buildTable(dfDisagg, (await import('./contracts')).DISAGG_CONTRACTS, 'm_money_positions_long_all', 'm_money_positions_short_all', priceData);

  return {
    report_date: reportDate,
    generated_at: new Date().toISOString(),
    tff_rows: tffRows,
    disagg_rows: disaggRows,
    price_data: priceData,
  };
}
