import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { customerKeys } from "@/lib/query-keys";
import { getCustomer, listCustomers, setCustomerStatus } from "../api/customers.api";
import type { CustomerFilters } from "../types/customer.types";

export function useCustomers(filters: CustomerFilters) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: () => listCustomers(filters),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => getCustomer(id),
    enabled: id.length > 0,
  });
}

export function useSetCustomerStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isActive: boolean) => setCustomerStatus(id, isActive),
    onSuccess: (customer) => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.all });
      toast.success(customer.isActive ? "Customer enabled" : "Customer disabled");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}
