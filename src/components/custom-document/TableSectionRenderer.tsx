import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import type { DocumentSection, TableColumn } from '@/components/admin/types';

interface TableRow {
  id: string;
  [key: string]: string;
}

interface TableSectionRendererProps {
  section: DocumentSection;
  rows: TableRow[];
  onChange: (rows: TableRow[]) => void;
  lineItems?: any[];
}

export function TableSectionRenderer({
  section,
  rows,
  onChange,
  lineItems = [],
}: TableSectionRendererProps) {
  const columns = section.columns || [];
  const maxRows = section.maxRows || 20;

  const addRow = () => {
    if (rows.length >= maxRows) return;
    const newRow: TableRow = {
      id: `row_${Date.now()}`,
    };
    columns.forEach((col) => {
      newRow[col.id] = '';
    });
    onChange([...rows, newRow]);
  };

  const removeRow = (rowId: string) => {
    onChange(rows.filter((r) => r.id !== rowId));
  };

  const updateCell = (rowId: string, columnId: string, value: string) => {
    onChange(
      rows.map((row) =>
        row.id === rowId ? { ...row, [columnId]: value } : row
      )
    );
  };

  const populateFromLineItems = () => {
    const newRows: TableRow[] = lineItems.slice(0, maxRows).map((item, index) => {
      const row: TableRow = { id: `li_${index}_${Date.now()}` };
      columns.forEach((col) => {
        if (col.mapping.source === 'line_item' && col.mapping.property) {
          row[col.id] = item.properties?.[col.mapping.property] || item[col.mapping.property] || '';
        } else {
          row[col.id] = '';
        }
      });
      return row;
    });
    onChange(newRows);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">{section.title}</h4>
        <div className="flex gap-2">
          {lineItems.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={populateFromLineItems}
            >
              Load from Deal
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRow}
            disabled={rows.length >= maxRows}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Row
          </Button>
        </div>
      </div>

      {columns.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {columns.map((col) => (
                  <th key={col.id} className="text-left p-2 font-medium">
                    {col.label}
                  </th>
                ))}
                <th className="w-10 p-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="text-center py-4 text-muted-foreground"
                  >
                    No rows yet. Click "Add Row" or "Load from Deal" to add data.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    {columns.map((col) => (
                      <td key={col.id} className="p-1">
                        <Input
                          value={row[col.id] || ''}
                          onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                          className="h-8 text-sm"
                        />
                      </td>
                    ))}
                    <td className="p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeRow(row.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {rows.length} / {maxRows} rows
      </p>
    </div>
  );
}
