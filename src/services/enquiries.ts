import type { Enquiry, EnquiryInput } from "@/domain/enquiry/schema";
import type { ServiceResult } from "./errors";

/** Catering, collabs and launches, workshops (Blueprint section 9: POST /api/enquiries). */
export interface EnquiryService {
  submit(input: EnquiryInput, idempotencyKey: string): Promise<ServiceResult<Enquiry>>;
}
