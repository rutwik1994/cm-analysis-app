/**
 * Databricks SQL Statement Execution API client
 * Docs: https://docs.databricks.com/api/workspace/statementexecution
 *
 * Required env vars (add to .env.local):
 *   DATABRICKS_HOST      = hf-pa.cloud.databricks.com
 *   DATABRICKS_TOKEN     = dapi...
 *   DATABRICKS_WAREHOUSE_ID = 04a333c960a40e62  (last segment of your HTTP path)
 */

const HOST         = process.env.DATABRICKS_HOST!;
const TOKEN        = process.env.DATABRICKS_TOKEN!;
const WAREHOUSE_ID = process.env.DATABRICKS_WAREHOUSE_ID!;

if (!HOST || !TOKEN || !WAREHOUSE_ID) {
  // Warn at import time so misconfiguration is obvious in server logs
  if (process.env.NODE_ENV !== 'test') {
    console.warn('[databricks] Missing env vars — DATABRICKS_HOST / DATABRICKS_TOKEN / DATABRICKS_WAREHOUSE_ID');
  }
}

interface StatementResponse {
  statement_id: string;
  status: { state: string; error?: { message: string } };
  result?: {
    data_array?: (string | null)[][];   // JSON_ARRAY format
    schema: { columns: { name: string; type_name: string }[] };
  };
  manifest?: {
    schema: { columns: { name: string; type_name: string }[] };
  };
}

/**
 * Run a SQL query on Databricks and return rows as plain objects.
 * Uses the synchronous execution path (wait_timeout=30s).
 */
export async function queryDatabricks<T = Record<string, unknown>>(
  sql: string
): Promise<T[]> {
  const url = `https://${HOST}/api/2.0/sql/statements`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      statement: sql,
      warehouse_id: WAREHOUSE_ID,
      wait_timeout: '30s',   // wait up to 30s for inline result
      on_wait_timeout: 'CANCEL',
      format: 'JSON_ARRAY',
      disposition: 'INLINE',
    }),
    next: { revalidate: 300 }, // Next.js ISR: re-fetch every 5 minutes
  });

  if (!res.ok) {
    throw new Error(`Databricks HTTP ${res.status}: ${await res.text()}`);
  }

  const data: StatementResponse = await res.json();

  if (data.status.state === 'FAILED') {
    throw new Error(`Databricks query failed: ${data.status.error?.message}`);
  }

  if (data.status.state !== 'SUCCEEDED') {
    throw new Error(`Databricks query state: ${data.status.state} — increase wait_timeout`);
  }

  // Extract column names from manifest or result schema
  const columns =
    (data.manifest?.schema?.columns ?? data.result?.schema?.columns ?? []).map(
      (c) => c.name
    );

  // JSON_ARRAY format: data_array is rows of plain string values
  const rows = data.result?.data_array ?? [];

  return rows.map((row) => {
    const obj: Record<string, unknown> = {};
    row.forEach((cell, i) => {
      obj[columns[i]] = cell ?? null;
    });
    return obj as T;
  }) as T[];
}
