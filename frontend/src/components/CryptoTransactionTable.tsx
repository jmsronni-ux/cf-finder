import React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type CryptoTransaction = {
  id: string
  date: string
  transaction: string
  amount: number
  currency: string
  status: "Success" | "Fail" | "Pending"
  level: number
}


interface CryptoTransactionTableProps {
  data: CryptoTransaction[];
  onTransactionStatusChange?: (nodeId: string, status: 'Pending' | 'Success' | 'Fail') => void;
  onRowClick?: (transaction: CryptoTransaction) => void;
}

// Helper function to get text color based on status
const getStatusColor = (status: "Success" | "Fail" | "Pending") => {
  switch (status) {
    case "Success":
      return "text-green-500"
    case "Fail":
      return "text-red-500"
    case "Pending":
    default:
      return "text-white"
  }
}

// Helper function to get background color based on status
const getStatusBackgroundColor = (status: "Success" | "Fail" | "Pending") => {
  switch (status) {
    case "Success":
      return "bg-green-500/5 hover:bg-green-500/10 cursor-pointer"
    case "Fail":
      return "bg-red-500/5 hover:bg-red-500/10 cursor-pointer"
    case "Pending":
        return "bg-yellow-500/5 hover:bg-yellow-500/10 cursor-pointer"
    default:
      return "bg-transparent hover:bg-transparent cursor-pointer"
  }
}

export function CryptoTransactionTable({ data, onTransactionStatusChange, onRowClick }: CryptoTransactionTableProps) {
  return (
    <div className="w-full text-white">
      <div className="overflow-hidden">
        <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-500/50 hover:bg-transparent w-fit text-white">
                <TableHead className="border-r border-gray-500/20 py-2">Status</TableHead>
                <TableHead className="border-r border-gray-500/20 py-2">Date</TableHead>
                <TableHead className="border-r border-gray-500/20 py-2">Level</TableHead>
                <TableHead className="border-r border-gray-500/20 py-2">Transaction</TableHead>
                <TableHead className="text-right py-2">Amount (USDT)</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {data.map((transaction) => (
              <TableRow 
                key={transaction.id} 
                className={`border-b border-gray-500/50 ${getStatusBackgroundColor(transaction.status)}`}
                onClick={() => onRowClick?.(transaction)}
              >
                <TableCell className={`border-r border-gray-500/20 py-2 w-10 text-center ${getStatusColor(transaction.status)}`}>
                  {transaction.status}
                </TableCell>
                <TableCell className="border-r border-gray-500/20 py-2 text-center w-[8rem]">{transaction.date}</TableCell>
                <TableCell className="border-r border-gray-500/20 py-2 text-center">
                  Level {transaction.level}
                </TableCell>
                <TableCell className={`font-medium border-r border-gray-500/20 py-2 ${getStatusColor(transaction.status)}`}>
                  {transaction.transaction}
                </TableCell>
                <TableCell className="text-right py-2">
                  {transaction.status === 'Success' ? Number(transaction.amount).toFixed(2) : '0.00'} USDT
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
