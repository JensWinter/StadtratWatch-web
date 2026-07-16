import { assert, describe, test } from 'vitest';
import {
  PAPER_BATCH_NO_DIGITS,
  PAPER_BATCH_SIZE,
  toPaperBatchNo,
} from './paper-batch.ts';

describe('toPaperBatchNo', () => {
  test('puts the first paper id into batch zero', () => {
    assert.equal(toPaperBatchNo(0), '0000');
  });

  test('keeps every id below the batch size in batch zero', () => {
    assert.equal(toPaperBatchNo(1), '0000');
    assert.equal(toPaperBatchNo(PAPER_BATCH_SIZE - 1), '0000');
  });

  test('starts a new batch once the batch size is reached', () => {
    assert.equal(toPaperBatchNo(PAPER_BATCH_SIZE), '0001');
    assert.equal(toPaperBatchNo(PAPER_BATCH_SIZE + 1), '0001');
    assert.equal(toPaperBatchNo(2 * PAPER_BATCH_SIZE - 1), '0001');
    assert.equal(toPaperBatchNo(2 * PAPER_BATCH_SIZE), '0002');
  });

  test('pads the batch number to a fixed width so filenames sort lexicographically', () => {
    const batchNos = [0, 100, 1000, 10_000, 100_000].map(toPaperBatchNo);

    assert.deepEqual(batchNos, ['0000', '0001', '0010', '0100', '1000']);
    assert.deepEqual(batchNos.toSorted(), batchNos);
  });

  test('does not truncate batch numbers wider than the padding', () => {
    assert.equal(toPaperBatchNo(1_000_000), '10000');
  });

  test('derives real paper ids from the published assets', () => {
    assert.equal(toPaperBatchNo(11), '0000');
    assert.equal(toPaperBatchNo(239_142), '2391');
  });

  test('exposes the contract the generators and the web client share', () => {
    assert.equal(PAPER_BATCH_SIZE, 100);
    assert.equal(PAPER_BATCH_NO_DIGITS, 4);
  });
});
