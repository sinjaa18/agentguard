import {demoAgent} from "@/data/demoAgent";
import {Agent} from "@/types/agent";

export function getCurrentAgent():Agent{
  if(typeof window==="undefined")return demoAgent;

  const stored=localStorage.getItem("agentguard_new_agent");

  if(!stored)return demoAgent;

  try{
    return JSON.parse(stored) as Agent;
  }catch{
    return demoAgent;
  }
}