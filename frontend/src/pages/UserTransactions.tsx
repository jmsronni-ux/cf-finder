import React, { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { CryptoTransactionTable, type CryptoTransaction } from "@/components/CryptoTransactionTable";
import { useLevelData } from "@/hooks/useLevelData";

type AnyObject = Record<string, any>;

const tryParseDate = (value: string): number => {
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
};

const UserTransactions: React.FC = () => {
  const { user } = useAuth();
  const { levels, loading: levelsLoading } = useLevelData();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const currentLevel = user.tier === 0 ? 1 : (user.tier || 1);
  const hasSeenFirstLevel = (user as AnyObject)["lvl1anim"] === 1;
  const hasSeenCurrentLevel = (user as AnyObject)[`lvl${currentLevel}anim`] === 1;

  // Build transactions from all levels strictly below the current level
  const transactions = useMemo(() => {
    if (levelsLoading) return [] as CryptoTransaction[];
    const rows: CryptoTransaction[] = [];

    // Only proceed if the user has seen level 1
    if (!hasSeenFirstLevel) return rows;

    const eligibleLevels = levels.filter((lvl: AnyObject) => {
      const lvlNum = Number(lvl.level);
      if (lvlNum < currentLevel) return true;
      // Include current level only if the user has watched it
      if (lvlNum === currentLevel && hasSeenCurrentLevel) return true;
      return false;
    });
    for (const lvl of eligibleLevels) {
      const nodes: AnyObject[] = Array.isArray(lvl.nodes) ? lvl.nodes : [];
      for (const node of nodes) {
        if (node?.type !== "fingerprintNode") continue;
        const t = node?.data?.transaction;
        const nodeLevel = Number(node?.data?.level ?? lvl.level ?? 1);
        if (!t) continue;
        rows.push({
          id: String(t.id ?? crypto.randomUUID()),
          date: String(t.date ?? ""),
          transaction: String(t.transaction ?? ""),
          amount: Number(t.amount ?? 0),
          currency: String(t.currency ?? ""),
          status: (t.status ?? "Pending") as CryptoTransaction["status"],
          level: nodeLevel,
        });
      }
    }
    return rows.sort((a, b) => {
      if (a.level !== b.level) return b.level - a.level; // higher level first
      return tryParseDate(b.date) - tryParseDate(a.date); // newest first within level
    });
  }, [levels, levelsLoading, currentLevel, hasSeenFirstLevel, hasSeenCurrentLevel]);

  const showEmptyState = !hasSeenFirstLevel || transactions.length === 0;

  return (
    <div className="w-full border border-border rounded-xl">
      <div className="group w-full">
        <Card className="border-none bg-transparent w-full">
          <CardContent className="p-0">
            {showEmptyState ? (
              <div className="w-full p-6 text-center text-sm text-muted-foreground">
                No Transactions yet
              </div>
            ) : (
              <CryptoTransactionTable data={transactions} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserTransactions;


