import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export function TableWrapper({
  data = [],
  columns = [],
  emptyText = 'No records found',
  onRowClick,
  height = 'max-h-[350px]',
}) {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedRowId, setSelectedRowId] = useState(null);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[3px] overflow-hidden flex flex-col w-full">
      <div className={`overflow-x-auto overflow-y-auto ${height}`}>
        <table className="w-full text-left border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-[#F1F5F9] border-b border-[#E2E8F0]">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="erp-table-th select-none cursor-pointer hover:bg-[#E2E8F0] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() === 'asc' ? (
                        <ArrowUp className="w-3 h-3 text-[#2563EB]" />
                      ) : header.column.getIsSorted() === 'desc' ? (
                        <ArrowDown className="w-3 h-3 text-[#2563EB]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-[#94A3B8] opacity-50 hover:opacity-100" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => {
                const isSelected = selectedRowId === row.id;
                return (
                  <tr
                    key={row.id}
                    onClick={() => {
                      setSelectedRowId(row.id);
                      if (onRowClick) onRowClick(row.original);
                    }}
                    className={`erp-table-row cursor-pointer transition-colors ${
                      isSelected ? 'selected font-medium' : ''
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="erp-table-td">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-8 text-center text-xs text-[#64748B] italic bg-[#F8FAFC]"
                >
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-[#F8FAFC] px-3 py-1.5 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#64748B]">
        <span>Total Records: <strong className="text-[#0F172A]">{data.length}</strong></span>
        <span>Showing {table.getRowModel().rows.length} rows</span>
      </div>
    </div>
  );
}
