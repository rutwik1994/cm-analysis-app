import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for queryDatabricks chunk pagination.
 *
 * The function is the only export from lib/databricks.ts, but it reads
 * env vars at module-load time. We set them before importing, then mock
 * global fetch to control what Databricks "returns".
 */

// Set required env vars before the module loads
process.env.DATABRICKS_HOST         = 'test.databricks.com';
process.env.DATABRICKS_TOKEN        = 'test-token';
process.env.DATABRICKS_WAREHOUSE_ID = 'test-warehouse';

// Import AFTER setting env vars
const { queryDatabricks } = await import('../lib/databricks');

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal SUCCEEDED response with a single chunk of rows */
function makeResponse(
  statementId: string,
  columns: string[],
  rows: (string | null)[][],
  nextChunkIndex?: number
) {
  return {
    statement_id: statementId,
    status: { state: 'SUCCEEDED' },
    manifest: {
      schema: { columns: columns.map(name => ({ name, type_name: 'STRING' })) },
      total_chunk_count: nextChunkIndex != null ? 2 : 1,
      total_row_count: rows.length,
    },
    result: {
      schema: { columns: columns.map(name => ({ name, type_name: 'STRING' })) },
      data_array: rows,
      ...(nextChunkIndex != null ? { next_chunk_index: nextChunkIndex } : {}),
    },
  };
}

/** Build a standalone chunk response (no schema — same as real Databricks) */
function makeChunk(rows: (string | null)[][], nextChunkIndex?: number) {
  return {
    data_array: rows,
    ...(nextChunkIndex != null ? { next_chunk_index: nextChunkIndex } : {}),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('queryDatabricks — chunk pagination', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns all rows when result fits in a single chunk', async () => {
    const rows = [['PO-001', '100.00'], ['PO-002', '200.00']];
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => makeResponse('stmt-1', ['poNumber', 'netValue'], rows),
    });

    const result = await queryDatabricks('SELECT 1');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ poNumber: 'PO-001', netValue: '100.00' });
    expect(result[1]).toEqual({ poNumber: 'PO-002', netValue: '200.00' });
    // Only one fetch call (the initial POST)
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('fetches chunk 1 when result spans two chunks and combines rows', async () => {
    const chunk0Rows = [['PO-001', '100.00'], ['PO-002', '200.00']];
    const chunk1Rows = [['PO-003', '300.00']];

    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    // Call 1: initial POST — returns chunk 0 with pointer to chunk 1
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeResponse('stmt-2', ['poNumber', 'netValue'], chunk0Rows, 1),
    });
    // Call 2: GET chunk 1
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeChunk(chunk1Rows),
    });

    const result = await queryDatabricks('SELECT 1');

    expect(result).toHaveLength(3);
    expect(result[2]).toEqual({ poNumber: 'PO-003', netValue: '300.00' });
    // Two fetches: initial POST + one chunk fetch
    expect(fetch).toHaveBeenCalledTimes(2);
    // Second call should hit the chunk endpoint
    const chunkUrl = (mockFetch.mock.calls[1][0] as string);
    expect(chunkUrl).toContain('/result/chunks/1');
  });

  it('fetches all chunks in a three-chunk result', async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeResponse('stmt-3', ['id'], [['A']], 1),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeChunk([['B']], 2),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeChunk([['C']]),
      });

    const result = await queryDatabricks('SELECT 1');

    expect(result).toHaveLength(3);
    expect(result.map(r => r.id)).toEqual(['A', 'B', 'C']);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('returns empty array when result has no rows', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => makeResponse('stmt-4', ['id'], []),
    });

    const result = await queryDatabricks('SELECT 1');
    expect(result).toEqual([]);
  });

  it('throws when Databricks returns HTTP error', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    });

    await expect(queryDatabricks('SELECT 1')).rejects.toThrow('Databricks HTTP 403');
  });

  it('throws when query status is FAILED', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        statement_id: 'stmt-5',
        status: { state: 'FAILED', error: { message: 'Syntax error near FROM' } },
      }),
    });

    await expect(queryDatabricks('BAD SQL')).rejects.toThrow('Syntax error near FROM');
  });

  it('maps null cells to null in the returned object', async () => {
    const rows = [['PO-001', null]];
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => makeResponse('stmt-6', ['poNumber', 'netValue'], rows),
    });

    const result = await queryDatabricks('SELECT 1');
    expect(result[0]).toEqual({ poNumber: 'PO-001', netValue: null });
  });
});
