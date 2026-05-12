import { renderReportPdf, streamCsv } from '../src/modules/reports/reports.service';

describe('reports service utilities', () => {
  it('streams large CSV payloads without building one huge string in the caller', async () => {
    const rows = Array.from({ length: 50_000 }, (_, index) => ({
      row: index + 1,
      value: `item-${index + 1}`,
    }));

    const stream = streamCsv(rows);
    let lineCount = 0;

    for await (const chunk of stream) {
      const text = chunk.toString();
      lineCount += text.split('\n').filter(Boolean).length;
    }

    expect(lineCount).toBe(50_001);
  });

  it('renders report pdf output as a buffer', async () => {
    const pdf = await renderReportPdf('Test Report', [
      { product: 'Aspirin', total: 12 },
      { product: 'Amoxicillin', total: 6 },
    ]);

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(500);
  });
});
