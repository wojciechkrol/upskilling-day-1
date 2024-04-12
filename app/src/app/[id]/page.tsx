"use client";

import { useEffect, useState } from "react";

interface Params {
  params: {
    id: string;
  };
}

export default function Home({ params }: Params) {
  const [video, setVideo] = useState<string | null | undefined>(undefined);

  const fetchVideo = async () => {
    const response = await fetch(`/video/${params.id}`);
    const videoBlob = await response.blob();

    if (response.ok) {
      setVideo(URL.createObjectURL(videoBlob));
    } else {
      setVideo(null);
    }
  };

  useEffect(() => {
    fetchVideo();

    const eventSource = new EventSource(
      "http://localhost:8081/sse/" + params.id
    );
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.success === true) {
        fetchVideo();
      } else {
        console.error("Error:", event);
        alert("Failed to process video");
      }
    };
    eventSource.onerror = (error) => {
      eventSource.close();
      console.error("Error:", error);
    };

    return () => {
      eventSource.close();
    };
  }, [params.id]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      {video === null && (
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-bold">MyTube</h1>
          <p className="text-gray-600">Upload and share your videos.</p>
          <div className="mt-4 text-center">Video not ready yet...</div>
        </div>
      )}
      {video && <video src={video} controls className="mt-4" />}
    </main>
  );
}
