"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUploading(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/upload", {
      method: "POST",
      body: formData,
    });

    setUploading(false);
    if (response.ok) {
      const { id } = await response.json();
      router.push(`/${id}`);
    } else {
      alert("Failed to upload video");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <Card className="p-4">
        <h1 className="text-2xl font-bold">MyTube</h1>
        <p className="text-gray-600">Upload and share your videos.</p>
        <form className="mt-4" onSubmit={handleSubmit}>
          <Label htmlFor="video">Video</Label>
          <Input type="file" id="video" name="video" accept="video/mp4" />
          <div className="my-4">
            <Select name="priority">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select priority..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low priority</SelectItem>
                <SelectItem value="high">High priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="mt-4" disabled={uploading}>
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
