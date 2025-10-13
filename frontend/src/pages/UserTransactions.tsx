import React, { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { CryptoTransactionTable, type CryptoTransaction } from "@/components/CryptoTransactionTable";
import levelOneData from "@/data/level-one.json";

type AnyObject = Record<string, any>;

const mapLevelOneToTransactions = (): CryptoTransaction[] => {
  const fingerprintNodes = (levelOneData as AnyObject).nodes?.filter((n: AnyObject) => n.type === "fingerprintNode") || [];
  const rows: CryptoTransaction[] = fingerprintNodes
    .filter((node: AnyObject) => node?.data?.transaction)
    .map((node: AnyObject) => {
      const t = node.data.transaction;
      return {
        id: String(t.id ?? crypto.randomUUID()),
        date: String(t.date ?? ""),
        transaction: String(t.transaction ?? ""),
        amount: Number(t.amount ?? 0),
        currency: String(t.currency ?? ""),
        status: (t.status ?? "Pending") as CryptoTransaction["status"],
        level: Number(node.data.level ?? 1),
      };
    });
  return rows;
};

const tryParseDate = (value: string): number => {
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
};

const UserTransactions: React.FC = () => {
  const { user } = useAuth();

  const dashboardLikeTransactions = useMemo(() => mapLevelOneToTransactions(), []);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Only show dummy transactions from level-one.json, sorted by date
  const sortedTransactions = [...dashboardLikeTransactions].sort(
    (a, b) => tryParseDate(b.date) - tryParseDate(a.date)
  );

  return (
    <div className="w-full border border-border rounded-xl">
      <div className="group w-full">
        <Card className="border-none bg-transparent w-full">
          <CardContent className="p-0">
            <CryptoTransactionTable data={sortedTransactions} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserTransactions;


