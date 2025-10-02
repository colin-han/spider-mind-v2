"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { createMindmap } from "@/lib/actions/mindmap-actions";

/**
 * 创建思维导图按钮
 * 点击后直接创建并跳转到编辑页面
 */
export function CreateButton() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate() {
    setIsCreating(true);

    try {
      const result = await createMindmap();

      if (result.success && result.shortId) {
        toast.success("创建成功");
        router.push(`/mindmaps/${result.shortId}`);
      } else {
        toast.error(result.error || "创建失败");
        setIsCreating(false);
      }
    } catch (_error) {
      toast.error("创建失败，请重试");
      setIsCreating(false);
    }
  }

  return (
    <Button
      onClick={handleCreate}
      loading={isCreating}
      size="lg"
      data-testid="dashboard-create-button"
    >
      {isCreating ? "创建中..." : "+ 新建思维导图"}
    </Button>
  );
}
