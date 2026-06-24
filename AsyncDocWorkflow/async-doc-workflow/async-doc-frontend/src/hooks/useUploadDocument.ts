import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadDocument } from "../api/documents";

export const useUploadDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["documents"],
      });
    },
  });
};