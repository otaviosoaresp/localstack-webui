import { Routes, Route } from "react-router-dom";
import { S3BucketList } from "./S3BucketList";
import { BucketDetail } from "./BucketDetail";

export function S3Page() {
  return (
    <Routes>
      <Route index element={<S3BucketList />} />
      <Route path=":bucketName/*" element={<BucketDetail />} />
    </Routes>
  );
}
