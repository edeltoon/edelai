'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {RecordsSnapshot} from './reader';
import {professorApi} from '../api';
export function useRecords(){
 const [snapshot,setSnapshot]=useState<RecordsSnapshot>({students:[],warnings:[]});
 const [loaded,setLoaded]=useState(false);
 const [error,setError]=useState('');
 const sequence=useRef(0);
 const refresh=useCallback(async()=>{
  const seq=++sequence.current;setLoaded(false);setError('');
  try{const result=await professorApi<{snapshot:RecordsSnapshot}>('records');if(seq===sequence.current)setSnapshot(result.snapshot);}
  catch(e){if(seq===sequence.current){setError(e instanceof Error?e.message:'기록 조회 실패');setSnapshot({students:[],warnings:[]});}}
  finally{if(seq===sequence.current)setLoaded(true);}
 },[]);
 useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)void refresh();});return()=>{active=false;};},[refresh]);
 return {snapshot,loaded,refresh,error};
}
