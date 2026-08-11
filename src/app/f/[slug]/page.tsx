import React from "react";
import { getFormRuntimeSchema } from "@/lib/form-engine/schema-converter";
import { FormRuntime } from "@/components/runtime/FormRuntime";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const schema = await getFormRuntimeSchema(params.slug);
  if (!schema) return { title: "Form Not Found — Experience Forms" };

  return {
    title: `${schema.metadata.title} | Experience Forms`,
    description: schema.metadata.description || "Interactive Form",
  };
}

export default async function PublicFormPage({ params }: { params: { slug: string } }) {
  const schema = await getFormRuntimeSchema(params.slug);

  if (!schema || schema.metadata.status !== "PUBLISHED") {
    notFound();
  }

  return <FormRuntime schema={schema} />;
}
