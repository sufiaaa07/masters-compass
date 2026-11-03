// Checks that each user can only read and write their own users/{uid} document.
// Run with: npm run test:rules   (needs Java for the Firestore emulator)
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {readFileSync} from 'fs';
import {doc,getDoc,setDoc,getDocs,collection,serverTimestamp,deleteDoc} from 'firebase/firestore';
const env=await initializeTestEnvironment({projectId:'demo-mc',firestore:{rules:readFileSync(new URL('../firestore.rules', import.meta.url),'utf8'),host:'127.0.0.1',port:8080}});
const alice=env.authenticatedContext('alice').firestore(), bob=env.authenticatedContext('bob').firestore(), anon=env.unauthenticatedContext().firestore();
const good={schemaVersion:1,email:'a@x',displayName:'A',workspace:{p:[]},updatedAt:serverTimestamp()};
let failed=0;
const t=async(n,p)=>{try{await p;console.log('PASS',n)}catch(e){failed++;console.log('FAIL',n,e.message)}};
await t('alice writes own',assertSucceeds(setDoc(doc(alice,'users/alice'),good,{merge:true})));
await t('alice reads own',assertSucceeds(getDoc(doc(alice,'users/alice'))));
await t('bob cannot read alice',assertFails(getDoc(doc(bob,'users/alice'))));
await t('bob cannot write alice',assertFails(setDoc(doc(bob,'users/alice'),good)));
await t('anon cannot read',assertFails(getDoc(doc(anon,'users/alice'))));
await t('nobody can list users',assertFails(getDocs(collection(alice,'users'))));
await t('extra field rejected',assertFails(setDoc(doc(alice,'users/alice'),{...good,admin:true})));
await t('other collection closed',assertFails(setDoc(doc(alice,'other/x'),{a:1})));
await t('alice deletes own',assertSucceeds(deleteDoc(doc(alice,'users/alice'))));
await env.cleanup();
if(failed){console.error(failed+' rule check(s) failed');process.exit(1)}
