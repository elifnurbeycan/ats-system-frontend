import { apiClient, getCompanyId } from "./client";
import type { ApiResponse, PageData } from "../api";
import type { InteractionChannel } from "./interaction-api";
export type ContactLeadStatus="CONTACTING"|"CONVERTED"|"REJECTED";
export type ContactResolution="WAITING"|"POSITIVE"|"REJECTED";
export type ContactRejectionReason="NO_RESPONSE"|"NOT_INTERESTED"|"POSITION_MISMATCH"|"SALARY_EXPECTATION"|"LOCATION"|"TIMING"|"ACCEPTED_ANOTHER_OFFER"|"OTHER";
export interface ContactLead{id:number;firstName:string;lastName:string;fullName:string;linkedinUrl:string|null;positionId:number;positionTitle:string;departmentId:number;departmentName:string;pipelineId:number;pipelineName:string;status:ContactLeadStatus;contactChannel:InteractionChannel|null;rejectionReason:ContactRejectionReason|null;note:string|null;candidateProcessId:number|null;resolvedAt:string|null;createdAt:string;updatedAt:string;}
export const contactLeadApi={
 create:async(input:{firstName:string;lastName:string;linkedinUrl?:string;positionId:number;pipelineId:number}):Promise<ContactLead>=>(await apiClient.post<ApiResponse<ContactLead>>(`/${getCompanyId()}/contact-leads`,input)).data.data,
 getPage:async(options:{page?:number;size?:number;search?:string;status?:ContactLeadStatus}={}):Promise<PageData<ContactLead>>=>(await apiClient.get<ApiResponse<PageData<ContactLead>>>(`/${getCompanyId()}/contact-leads`,{params:options})).data.data,
 resolve:async(id:number,input:{resolution:ContactResolution;channel:InteractionChannel;rejectionReason?:ContactRejectionReason;note?:string}):Promise<ContactLead>=>(await apiClient.patch<ApiResponse<ContactLead>>(`/${getCompanyId()}/contact-leads/${id}/resolve`,input)).data.data,
};
