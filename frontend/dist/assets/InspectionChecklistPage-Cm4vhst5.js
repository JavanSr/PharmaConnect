import{c as T,r as E,f as R,u as $,w as H,l as K,j as e,B as r,P as Q,d as p,x as U,h as W}from"./index-DXg22Z67.js";import{u as I}from"./useQuery-BGMjHezu.js";import{u as L}from"./useMutation-DPmiXKsA.js";import{C as v}from"./Card-DllA2rk8.js";import{f as k}from"./format-BKWj99fB.js";import{C as X}from"./clipboard-list-DbvRWOVZ.js";import"./differenceInCalendarDays-mpVmVgHd.js";/**
 * @license lucide-react v0.368.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B=T("CircleMinus",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M8 12h8",key:"1wcyev"}]]);/**
 * @license lucide-react v0.368.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y=T("Download",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"7 10 12 15 17 10",key:"2ggqvy"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"1vk2je"}]]),O={PENDING:{label:"Pending",color:"text-[#64748B] bg-[#EDF7F3]",icon:e.jsx(B,{size:16,className:"text-[#64748B]"})},COMPLIANT:{label:"Compliant",color:"text-[#1A6B5C] bg-[#D6F0E8]",icon:e.jsx(W,{size:16,className:"text-[#1A6B5C]"})},NON_COMPLIANT:{label:"Non-Compliant",color:"text-[#DC2626] bg-[#FEE2E2]",icon:e.jsx(U,{size:16,className:"text-[#DC2626]"})},NOT_APPLICABLE:{label:"Not Applicable",color:"text-[#64748B] bg-gray-100",icon:e.jsx(B,{size:16,className:"text-[#64748B]"})}},A=["PENDING","COMPLIANT","NON_COMPLIANT","NOT_APPLICABLE"],ie=()=>{const[i,P]=E.useState(null),[a,d]=E.useState(null),u=R(t=>t.toast),h=$(t=>t.user),N=H(t=>t.pharmacy),D=K(),M=["OWNER","PHARMACIST_IN_CHARGE","SUPER_ADMIN"].includes((h==null?void 0:h.role)??""),{data:f,isLoading:F}=I({queryKey:["inspection-checklists"],queryFn:()=>p.get("/compliance/inspection-checklists").then(t=>t.data)}),{data:g,isLoading:_}=I({queryKey:["inspection-checklist",i],queryFn:()=>p.get(`/compliance/inspection-checklists/${i}`).then(t=>t.data),enabled:!!i}),x=L({mutationFn:()=>p.post("/compliance/inspection-checklists"),onSuccess:t=>{u.success("New inspection checklist generated"),D.invalidateQueries({queryKey:["inspection-checklists"]}),P(t.data.data.id)},onError:()=>u.error("Failed to generate checklist")}),y=L({mutationFn:({itemIndex:t,status:n,notes:s})=>p.put(`/compliance/inspection-checklists/${i}/items`,{itemIndex:t,status:n,notes:s}),onSuccess:()=>{D.invalidateQueries({queryKey:["inspection-checklist",i]})},onError:()=>u.error("Failed to update item")}),b=(f==null?void 0:f.data)??[],c=g==null?void 0:g.data,o=(c==null?void 0:c.items)??[],S=(N==null?void 0:N.name)??"PharmaConnect Pharmacy",q=o.reduce((t,n,s)=>(t[n.category]||(t[n.category]=[]),t[n.category].push({item:n,idx:s}),t),{}),w=o.filter(t=>t.status==="COMPLIANT").length,j=o.filter(t=>t.status!=="NOT_APPLICABLE").length,l=j>0?Math.round(w/j*100):0,z=(t,n)=>{const s=A[(A.indexOf(n)+1)%A.length];s==="NON_COMPLIANT"?d({idx:t,text:o[t].notes??""}):y.mutate({itemIndex:t,status:s})},G=()=>{a&&(y.mutate({itemIndex:a.idx,status:"NON_COMPLIANT",notes:a.text}),d(null))};return e.jsxs("div",{className:"inspection-print-page space-y-5",children:[e.jsx("style",{children:`
          @media print {
            html,
            body,
            #root {
              height: auto !important;
              overflow: visible !important;
              background: #ffffff !important;
            }

            .inspection-print-page {
              display: block !important;
              height: auto !important;
              overflow: visible !important;
              background: #ffffff !important;
            }

            nav, aside, header, .no-print {
              display: none !important;
            }

            body {
              font-size: 12px;
            }

            .inspection-print-card {
              break-inside: avoid;
            }

            .inspection-print-title {
              display: block !important;
            }

            @page {
              margin: 20mm;
            }
          }
        `}),e.jsxs("div",{className:"flex items-center justify-between flex-wrap gap-3 no-print",children:[e.jsx("h1",{className:"text-xl font-bold text-[#0D4035]",children:"TMDA Inspection Checklist"}),M&&e.jsx(r,{leftIcon:e.jsx(Q,{size:16}),onClick:()=>x.mutate(),loading:x.isPending,children:"New Checklist"})]}),b.length>0&&e.jsx("div",{className:"flex gap-2 flex-wrap no-print",children:b.slice(0,5).map(t=>e.jsx("button",{onClick:()=>P(t.id),className:`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${i===t.id?"bg-[#1A6B5C] text-white border-[#1A6B5C]":"bg-white text-[#64748B] border-[#D6F0E8] hover:bg-[#EDF7F3]"}`,children:k(new Date(t.generatedAt),"dd MMM yyyy")},t.id))}),!F&&b.length===0&&e.jsx(v,{children:e.jsxs("div",{className:"py-12 text-center",children:[e.jsx(X,{size:48,className:"text-[#D6F0E8] mx-auto mb-3"}),e.jsx("p",{className:"text-sm font-medium text-[#0D4035] mb-1",children:"No checklists yet"}),e.jsx("p",{className:"text-xs text-[#64748B] mb-4",children:"Generate your first TMDA inspection readiness checklist to get started"}),M&&e.jsx(r,{onClick:()=>x.mutate(),loading:x.isPending,children:"Generate Checklist"})]})}),i&&c&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"hidden print:block inspection-print-title mb-4",children:[e.jsxs("h1",{className:"text-lg font-bold text-[#0D4035]",children:["Inspection Checklist - ",S]}),e.jsxs("p",{className:"text-sm text-gray-500",children:["Printed: ",k(new Date,"dd MMM yyyy HH:mm")]})]}),e.jsxs(v,{className:"inspection-print-card",children:[e.jsxs("div",{className:"flex items-center justify-between mb-3",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-sm font-semibold text-[#0D4035]",children:"Readiness Score"}),e.jsxs("p",{className:"text-xs text-[#64748B]",children:[w," of ",j," applicable items compliant"," · ","Generated ",k(new Date(c.generatedAt),"dd MMM yyyy")]})]}),e.jsxs("span",{className:`text-2xl font-bold ${l>=80?"text-[#1A6B5C]":l>=60?"text-[#D97706]":"text-[#DC2626]"}`,children:[l,"%"]})]}),e.jsx("div",{className:"w-full h-2 bg-[#D6F0E8] rounded-full overflow-hidden",children:e.jsx("div",{className:`h-full rounded-full transition-all duration-500 ${l>=80?"bg-[#1A6B5C]":l>=60?"bg-[#D97706]":"bg-[#DC2626]"}`,style:{width:`${l}%`}})}),e.jsx("div",{className:"flex gap-4 mt-3 flex-wrap",children:["COMPLIANT","NON_COMPLIANT","NOT_APPLICABLE","PENDING"].map(t=>{const n=o.filter(m=>m.status===t).length,s=O[t];return e.jsxs("div",{className:"flex items-center gap-1.5",children:[s.icon,e.jsxs("span",{className:"text-xs text-[#64748B]",children:[n," ",s.label]})]},t)})})]}),e.jsxs("p",{className:"text-xs text-[#64748B] px-1 no-print",children:["Click any item to cycle its status: ",e.jsx("strong",{children:"Pending → Compliant → Non-Compliant → Not Applicable"}),". Non-compliant items require a note."]}),_?e.jsx("div",{className:"text-center py-8 text-[#64748B]",children:"Loading checklist..."}):Object.entries(q).map(([t,n])=>e.jsx(v,{className:"inspection-print-card",header:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("span",{className:"text-sm font-semibold text-[#0D4035]",children:t}),e.jsx("div",{className:"flex gap-1",children:n.map(({item:s})=>e.jsx("span",{className:`w-2 h-2 rounded-full ${s.status==="COMPLIANT"?"bg-[#1A6B5C]":s.status==="NON_COMPLIANT"?"bg-[#DC2626]":s.status==="NOT_APPLICABLE"?"bg-gray-300":"bg-[#D6F0E8]"}`},s.item))})]}),padding:!1,children:e.jsx("div",{className:"divide-y divide-[#D6F0E8]",children:n.map(({item:s,idx:m})=>{const C=O[s.status];return e.jsx("div",{children:e.jsxs("button",{type:"button",onClick:()=>z(m,s.status),className:"w-full flex items-start gap-3 px-5 py-3 text-left hover:bg-[#EDF7F3] transition-colors",children:[e.jsx("div",{className:"mt-0.5 shrink-0",children:C.icon}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("p",{className:"text-sm text-[#0D4035]",children:s.item}),s.notes&&e.jsxs("p",{className:"text-xs text-[#DC2626] mt-0.5 italic",children:["Note: ",s.notes]})]}),e.jsx("span",{className:`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${C.color}`,children:C.label})]})},m)})})},t)),e.jsx("div",{className:"flex justify-end no-print",children:e.jsx(r,{className:"no-print",variant:"secondary",leftIcon:e.jsx(Y,{size:16}),onClick:()=>window.print(),children:"Export PDF Report"})})]}),a!==null&&e.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm no-print",children:e.jsxs("div",{className:"bg-white rounded-2xl border border-[#D6F0E8] shadow-xl w-full max-w-md p-6 space-y-4",children:[e.jsx("h3",{className:"text-base font-semibold text-[#0D4035]",children:"Non-Compliance Note Required"}),e.jsx("p",{className:"text-sm text-[#64748B]",children:"Describe the issue and any corrective action planned."}),e.jsx("textarea",{rows:4,value:a.text,onChange:t=>d(n=>n?{...n,text:t.target.value}:null),placeholder:"e.g. Temperature log not completed for last 3 days. Will train staff immediately.",className:"w-full px-3 py-2 text-sm border border-[#D6F0E8] rounded-xl focus:outline-none focus:border-[#DC2626] resize-none"}),e.jsxs("div",{className:"flex gap-3 justify-end",children:[e.jsx(r,{variant:"ghost",onClick:()=>d(null),children:"Cancel"}),e.jsx(r,{variant:"danger",disabled:!a.text.trim(),loading:y.isPending,onClick:G,children:"Mark Non-Compliant"})]})]})})]})};export{ie as InspectionChecklistPage};
