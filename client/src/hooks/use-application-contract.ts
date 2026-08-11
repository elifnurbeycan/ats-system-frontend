import { useEffect, useState } from "react";
import { FALLBACK_APPLICATION_CONTRACT, getApplicationContract, type ApplicationContract } from "@/lib/api/application-contract";

export function useApplicationContract(): ApplicationContract {
  const [contract, setContract] = useState(FALLBACK_APPLICATION_CONTRACT);
  useEffect(() => { let active = true; getApplicationContract().then((value) => active && setContract(value)); return () => { active = false; }; }, []);
  return contract;
}
