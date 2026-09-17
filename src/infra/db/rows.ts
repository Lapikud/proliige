export function onlyRow<Row>(rows: Array<Row>): Row {
  const [row] = rows;
  if (row === undefined) {
    throw new Error("Expected the query to return a row, but it returned none.");
  }

  return row;
}
