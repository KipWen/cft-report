import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { ReportData } from '@/lib/types';

interface SeriesPoint {
  date: string;
  net: number;
  net_z: number | null;
  long: number;
  long_z: number | null;
  short: number;
  short_z: number | null;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const instrumentsParam = request.nextUrl.searchParams.get('instruments');
  const instrumentFilter = instrumentsParam
    ? new Set(instrumentsParam.split(',').map(s => s.trim()).filter(Boolean))
    : null;

  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      return NextResponse.json({});
    }

    const files = fs.readdirSync(dataDir)
      .filter(f => f.endsWith('.json'))
      .sort();

    const seriesMap = new Map<string, {
      instrument: string;
      section: string;
      points: SeriesPoint[];
    }>();

    for (const file of files) {
      const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
      const report: ReportData = JSON.parse(content);
      const allRows = [...report.tff_rows, ...report.disagg_rows];

      for (const row of allRows) {
        if (instrumentFilter && !instrumentFilter.has(row.instrument)) continue;

        let entry = seriesMap.get(row.instrument);
        if (!entry) {
          entry = { instrument: row.instrument, section: row.section, points: [] };
          seriesMap.set(row.instrument, entry);
        }

        entry.points.push({
          date: report.report_date,
          net: row.net,
          net_z: row.net_z,
          long: row.long,
          long_z: row.long_z,
          short: row.short,
          short_z: row.short_z,
        });
      }
    }

    const result: Record<string, {
      instrument: string;
      section: string;
      series: SeriesPoint[];
    }> = {};

    for (const [name, entry] of seriesMap) {
      entry.points.sort((a, b) => a.date.localeCompare(b.date));
      result[name] = {
        instrument: entry.instrument,
        section: entry.section,
        series: entry.points,
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Trends API error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
