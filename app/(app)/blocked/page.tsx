"use client";

import React, { useEffect, useState } from "react";
import ProjectListView from "../components/ProjectListView";
import { useProjects } from "../components/useProjects";

async function safeJson(res: Response) {
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

export default function BlockedPage() {
  const { items, loading, error, refresh } = useProjects();
  const [isLeader, setIsLeader] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me-profile", { cache: "no-store" });
        const j = await safeJson(r);
        const me = j?.data ?? j;
        setIsLeader(me?.role === "LEADER" && me?.is_active === true);
      } catch {
        setIsLeader(false);
      }
    })();
  }, []);

  return (
    <ProjectListView
      title="Blocked"
      mode="BLOCKED"
      items={items}
      loading={loading}
      error={error}
      isLeader={isLeader}
      onRefresh={refresh}
    />
  );
}