"use client"
import React, { useEffect, useState } from "react"
import { useGetTransactionById } from "../services/transaction-service"
import { BASE_URL } from "@/lib/env"
import { useSession } from "next-auth/react"

export default function TransactionDetail({ id }: { id: string }) {
    const { data: transaction, isLoading, isError } = useGetTransactionById(id)
    const session = useSession()
    const [fileUrl, setFileUrl] = useState<string | null>(null)
    const [fileType, setFileType] = useState<"image" | "pdf" | null>(null)

    useEffect(() => {
        async function fetchFile() {
            try {
                const response = await fetch(`${BASE_URL}/transactions/${id}/proof`, {
                    headers: {
                        Authorization: `Bearer ${session.data?.user?.access_token}`,
                    },
                })

                if (response.ok) {
                    const contentType = response.headers.get("Content-Type")

                    // deteksi tipe file dari header
                    if (contentType?.includes("image")) {
                        const blob = await response.blob()
                        const imageUrl = URL.createObjectURL(blob)
                        setFileUrl(imageUrl)
                        setFileType("image")
                    } else if (contentType?.includes("pdf")) {
                        const blob = await response.blob()
                        const pdfUrl = URL.createObjectURL(blob)
                        setFileUrl(pdfUrl)
                        setFileType("pdf")
                    } else {
                        setFileUrl(null)
                        setFileType(null)
                    }
                } else {
                    setFileUrl(null)
                    setFileType(null)
                }
            } catch (error) {
                setFileUrl(null)
                setFileType(null)
            }
        }

        fetchFile()
    }, [id, session.data?.user?.access_token])

    if (isLoading) {
        return (
            <section className="container py-10 md:py-20">
                <h1 className="text-2xl font-bold mb-6">Transaction Detail</h1>
                <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                        <div key={i} className="h-6 bg-gray-200 rounded" />
                    ))}
                    <div className="h-48 bg-gray-200 rounded col-span-1 md:col-span-2" />
                </div>
            </section>
        )
    }

    if (isError) {
        return (
            <section className="container py-10 md:py-20 text-center">
                <h1 className="text-2xl font-bold mb-4">Yahaha gapunya akses</h1>
                <p className="text-gray-500">You does'nt have access to this transaction.</p>
            </section>
        )
    }


    if (!transaction) {
        return (
            <section className="container py-10 md:py-20 text-center">
                <h1 className="text-2xl font-bold mb-4">Transaction Detail</h1>
                <p className="text-gray-500">No transaction found.</p>
            </section>
        )
    }

    const t = transaction.data

    return (
        <section className="container py-10 md:py-20">
            <h1 className="text-3xl font-semibold mb-8 text-gray-800">Transaction Detail</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white shadow-lg rounded-2xl p-8 border border-gray-100">
                <div className="space-y-4">
                    <Info label="Transaction ID" value={t.id} />
                    <Info label="Amount" value={`Rp ${t.amount.toLocaleString()}`} />
                    <Info label="Type" value={t.transaction_type} />
                    <Info label="Category" value={t.category} />
                    <Info label="Date" value={new Date(t.date).toLocaleDateString()} />
                    <Info label="Period" value={t.period} />
                    {t.note && <Info label="Note" value={t.note} />}
                </div>

                {fileUrl && (
                    <div className="flex justify-center items-center">
                        {fileType === "image" ? (
                            <img
                                src={fileUrl}
                                alt="Transaction proof"
                                width={500}
                                height={300}
                                className="rounded-xl object-cover shadow-md border border-gray-100"
                            />
                        ) : fileType === "pdf" ? (
                            <iframe
                                src={fileUrl}
                                width="100%"
                                height="500"
                                className="rounded-xl border shadow-md"
                                title="Transaction proof PDF"
                            />
                        ) : (
                            <p className="text-gray-500">Unsupported file type</p>
                        )}
                    </div>
                )}
            </div>
        </section>
    )
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-lg font-medium text-gray-800">{value}</p>
        </div>
    )
}
