/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: <explanation> */
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatRupiah } from '@/lib/format'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { EllipsisVertical, TrendingDown, TrendingUp } from 'lucide-react'
import React, { useState } from 'react'
import type { Transaction } from '../types'
import { Skeleton } from '@/components/ui/skeleton'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { useDeleteTransaction } from '../services/transaction-service'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/error'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import DOMPurify from "dompurify";


export default function TransactionTable({ transactions, isLoading }: { transactions: Transaction[]; isLoading: boolean }) {
    const [id, setId] = useState("")
    const { mutateAsync: deleteTransactionMutation } = useDeleteTransaction(id)
    const queryClient = useQueryClient()
    const router = useRouter()
    const deleteTransaction = async (id: string) => {
        setId(id)
        try {
            await deleteTransactionMutation(null)
            queryClient.invalidateQueries({ queryKey: ["transactions"] })
            toast.success("Berhasil Menghapus")
            router.refresh()
        } catch (error) {
            toast.error(handleApiError(error))
        }
    }
    return (
        <Card className="animate-scale-in" >
            <CardHeader>
                <CardTitle>Transactions</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Note</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Proof file</TableHead>
                                <TableHead className='text-right'>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, index) => (
                                    // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                                    <TableRow key={index}>
                                        <TableCell>
                                            <Skeleton className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 bg-gray-200 rounded animate-pulse" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Skeleton className="h-4 w-24 bg-gray-200 rounded animate-pulse ml-auto" />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Skeleton className="h-4 w-24 bg-gray-200 rounded animate-pulse ml-auto" />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Skeleton className="h-4 w-24 bg-gray-200 rounded animate-pulse ml-auto" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : transactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No transactions found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transactions.map((transaction) => (
                                    <TableRow key={transaction.id}>
                                        <TableCell className="font-medium">
                                            {format(new Date(transaction.date), "MMM dd, yyyy")}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={transaction.transaction_type === "income" ? "default" : "destructive"}
                                                className={
                                                    transaction.transaction_type === "income"
                                                        ? "bg-success hover:bg-success/90"
                                                        : ""
                                                }
                                            >
                                                {transaction.transaction_type === "income" ? (
                                                    <TrendingUp className="w-3 h-3 mr-1" />
                                                ) : (
                                                    <TrendingDown className="w-3 h-3 mr-1" />
                                                )}
                                                {transaction.transaction_type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate">

                                            <div dangerouslySetInnerHTML={{
                                                __html: DOMPurify.sanitize(transaction.note || ''),

                                            }} />

                                        </TableCell>
                                        <TableCell>{transaction.period}</TableCell>
                                        <TableCell
                                            className={cn(
                                                "font-semibold",
                                                transaction.transaction_type === "income" ? "text-success" : "text-destructive"
                                            )}
                                        >
                                            {transaction.transaction_type === "income" ? "+" : "-"}
                                            {formatRupiah(transaction.amount)}
                                        </TableCell>
                                        <TableCell>
                                            {transaction.proof_file ? (
                                                <a href={transaction.proof_file} target="_blank" rel="noopener noreferrer">
                                                    View Proof
                                                </a>
                                            ) : (
                                                "No Proof"
                                            )}
                                        </TableCell>
                                        <TableCell className="flex justify-end self-end text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <EllipsisVertical className="h-5 w-5 cursor-pointer text-muted-foreground hover:text-foreground text-right" />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <Link href={`/dashboard/transaction/${transaction.id}`}>
                                                        <DropdownMenuItem>
                                                            View
                                                        </DropdownMenuItem>
                                                    </Link>
                                                    <Link href={`/dashboard/transaction/${transaction.id}/edit`}>
                                                        <DropdownMenuItem>
                                                            Edit
                                                        </DropdownMenuItem>
                                                    </Link>
                                                    <DropdownMenuItem onClick={() => deleteTransaction(transaction.id)}>
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {/* <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                        Showing {(filters.page - 1) * filters.limit + 1} to {filters.page * filters.limit} of{" "}
                        {mockTransactions.length} transactions
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFilterChange("page", String(filters.page - 1))}
                            disabled={filters.page === 1}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFilterChange("page", String(filters.page + 1))}
                        >
                            Next
                        </Button>
                    </div>
                </div> */}
            </CardContent>
        </Card >
    )
}
