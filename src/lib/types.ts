export interface PositionGroup {
  net: number;
  net_z: number | null;
  net_ww: number;
  net_ww_z: number | null;
  long: number;
  long_z: number | null;
  long_ww: number;
  long_ww_z: number | null;
  short: number;
  short_z: number | null;
  short_ww: number;
  short_ww_z: number | null;
  flow_state: string;
}

export interface InstrumentRow extends PositionGroup {
  instrument: string;
  section: string;
  price_chg: number | null;
}

export interface PriceInfo {
  ret: number;
  ticker: string;
  date_start: string;
  date_end: string;
  px_start: number;
  px_end: number;
}

export interface ReportData {
  report_date: string;
  generated_at: string;
  tff_rows: InstrumentRow[];
  disagg_rows: InstrumentRow[];
  price_data: Record<string, PriceInfo>;
  ai_analysis?: string;
}
