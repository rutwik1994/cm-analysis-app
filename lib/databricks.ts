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

interface ChunkResult {
  data_array?: (string | null)[][];
  next_chunk_index?: number;
  next_chunk_internal_link?: string;
}

interface StatementResponse {
  statement_id: string;
  status: { state: string; error?: { message: string } };
  result?: ChunkResult & {
    schema: { columns: { name: string; type_name: string }[] };
  };
  manifest?: {
    schema: { columns: { name: string; type_name: string }[] };
    total_chunk_count?: number;
    total_row_count?: number;
  };
}

/**
 * Fetch a single result chunk by index.
 * Used to page through multi-chunk inline results.
 */
async function fetchChunk(
  statementId: string,
  chunkIndex: number
): Promise<ChunkResult> {
  const url = `https://${HOST}/api/2.0/sql/statements/${statementId}/result/chunks/${chunkIndex}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) {
    throw new Error(`Databricks chunk fetch HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

/**
 * Run a SQL query on Databricks and return rows as plain objects.
 * Uses the synchronous execution path (wait_timeout=30s).
 * Automatically pages through all result chunks — the initial response
 * only contains the first chunk; subsequent chunks are fetched via the
 * chunk API to ensure no rows are silently dropped.
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
      wait_timeout: '50s',   // increased from 30s to handle larger result sets
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

  // Collect all rows across all chunks.
  // The initial response contains chunk 0; subsequent chunks must be fetched
  // individually. Without this loop, large result sets are silently truncated.
  const allRawRows: (string | null)[][] = [];

  let currentChunk: ChunkResult | undefined = data.result;
  while (currentChunk) {
    const chunkRows = currentChunk.data_array ?? [];
    allRawRows.push(...chunkRows);

    if (currentChunk.next_chunk_index != null) {
      currentChunk = await fetchChunk(data.statement_id, currentChunk.next_chunk_index);
    } else {
      break;
    }
  }

  const totalChunks = data.manifest?.total_chunk_count ?? 1;
  if (totalChunks > 1) {
    console.info(
      `[databricks] Fetched ${totalChunks} chunks, ${allRawRows.length} total rows` +
      (data.manifest?.total_row_count ? ` (expected ${data.manifest.total_row_count})` : '')
    );
  }

  return allRawRows.map((row) => {
    const obj: Record<string, unknown> = {};
    row.forEach((cell, i) => {
      obj[columns[i]] = cell ?? null;
    });
    return obj as T;
  }) as T[];
}
