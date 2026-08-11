"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ExperienceSchema } from "@/types/form-schema";
import { FormRuntime } from "@/components/runtime/FormRuntime";

export default function FormPreviewPage() {
  const params = useParams();
  const formId = params.formId as string;

  const [schema, setSchema] = useState<ExperienceSchema | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/forms/${formId}`);
        const data = await res.json();
        if (data.success) {
          setSchema(data.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [formId]);

  if (loading || !schema) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading Preview...</div>;
  }

  return <FormRuntime schema={schema} isPreview={true} />;
}
