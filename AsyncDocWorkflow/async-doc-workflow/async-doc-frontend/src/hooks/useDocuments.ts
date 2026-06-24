import { useQuery } from "@tanstack/react-query";
import { getDocuments } from "../api/documents";
import {type DocRecord } from "../types/documents";

export const useDocuments = () => {
  return useQuery<DocRecord[], Error>({
    queryKey: ["documents"],
    queryFn: getDocuments,
    refetchInterval: 3000,
  });
};