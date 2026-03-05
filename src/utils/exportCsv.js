/**
 * Export a list of rows to CSV and trigger download.
 * @param {Array<Object>} rows - Array of row objects
 * @param {Array<{ key: string, label: string, getValue?: (row: Object) => string }>} columns - Column defs. If getValue is provided, it's used; else row[key].
 * @param {string} filename - Download filename (e.g. 'extensions.csv')
 */
export function exportListToCsv(rows, columns, filename = 'export.csv') {
  const escape = (val) => {
    if (val == null) return ''
    const s = String(val).trim()
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return '"' + s.replace(/"/g, '""') + '"'
    }
    return s
  }

  const header = columns.map((c) => escape(c.label)).join(',')
  const body = rows.map((row) =>
    columns.map((c) => escape(c.getValue ? c.getValue(row) : (row[c.key] ?? ''))).join(',')
  )
  const csv = [header, ...body].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
