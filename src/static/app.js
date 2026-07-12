(()=>{function kt(){return{async:!1,breaks:!1,extensions:null,gfm:!0,hooks:null,pedantic:!1,renderer:null,silent:!1,tokenizer:null,walkTokens:null}}var ye=kt();function ws(d){ye=d}var je={exec:()=>null};function I(d,e=""){let t=typeof d=="string"?d:d.source,s={replace:(i,a)=>{let n=typeof a=="string"?a:a.source;return n=n.replace(q.caret,"$1"),t=t.replace(i,n),s},getRegex:()=>new RegExp(t,e)};return s}var Qs=(()=>{try{return!!new RegExp("(?<=1)(?<!1)")}catch{return!1}})(),q={codeRemoveIndent:/^(?: {1,4}| {0,3}\t)/gm,outputLinkReplace:/\\([\[\]])/g,indentCodeCompensation:/^(\s+)(?:```)/,beginningSpace:/^\s+/,endingHash:/#$/,startingSpaceChar:/^ /,endingSpaceChar:/ $/,nonSpaceChar:/[^ ]/,newLineCharGlobal:/\n/g,tabCharGlobal:/\t/g,multipleSpaceGlobal:/\s+/g,blankLine:/^[ \t]*$/,doubleBlankLine:/\n[ \t]*\n[ \t]*$/,blockquoteStart:/^ {0,3}>/,blockquoteSetextReplace:/\n {0,3}((?:=+|-+) *)(?=\n|$)/g,blockquoteSetextReplace2:/^ {0,3}>[ \t]?/gm,listReplaceTabs:/^\t+/,listReplaceNesting:/^ {1,4}(?=( {4})*[^ ])/g,listIsTask:/^\[[ xX]\] +\S/,listReplaceTask:/^\[[ xX]\] +/,listTaskCheckbox:/\[[ xX]\]/,anyLine:/\n.*\n/,hrefBrackets:/^<(.*)>$/,tableDelimiter:/[:|]/,tableAlignChars:/^\||\| *$/g,tableRowBlankLine:/\n[ \t]*$/,tableAlignRight:/^ *-+: *$/,tableAlignCenter:/^ *:-+: *$/,tableAlignLeft:/^ *:-+ *$/,startATag:/^<a /i,endATag:/^<\/a>/i,startPreScriptTag:/^<(pre|code|kbd|script)(\s|>)/i,endPreScriptTag:/^<\/(pre|code|kbd|script)(\s|>)/i,startAngleBracket:/^</,endAngleBracket:/>$/,pedanticHrefTitle:/^([^'"]*[^\s])\s+(['"])(.*)\2/,unicodeAlphaNumeric:/[\p{L}\p{N}]/u,escapeTest:/[&<>"']/,escapeReplace:/[&<>"']/g,escapeTestNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,escapeReplaceNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,unescapeTest:/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig,caret:/(^|[^\[])\^/g,percentDecode:/%25/g,findPipe:/\|/g,splitPipe:/ \|/,slashPipe:/\\\|/g,carriageReturn:/\r\n|\r/g,spaceLine:/^ +$/gm,notSpaceStart:/^\S*/,endingNewline:/\n$/,listItemRegex:d=>new RegExp(`^( {0,3}${d})((?:[	 ][^\\n]*)?(?:\\n|$))`),nextBulletRegex:d=>new RegExp(`^ {0,${Math.min(3,d-1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),hrRegex:d=>new RegExp(`^ {0,${Math.min(3,d-1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),fencesBeginRegex:d=>new RegExp(`^ {0,${Math.min(3,d-1)}}(?:\`\`\`|~~~)`),headingBeginRegex:d=>new RegExp(`^ {0,${Math.min(3,d-1)}}#`),htmlBeginRegex:d=>new RegExp(`^ {0,${Math.min(3,d-1)}}<(?:[a-z].*>|!--)`,"i")},ei=/^(?:[ \t]*(?:\n|$))+/,ti=/^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/,si=/^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,Be=/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,ii=/^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,Et=/(?:[*+-]|\d{1,9}[.)])/,ks=/^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,Es=I(ks).replace(/bull/g,Et).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/\|table/g,"").getRegex(),ai=I(ks).replace(/bull/g,Et).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/table/g,/ {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(),Tt=/^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/,ni=/^[^\n]+/,St=/(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/,oi=I(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label",St).replace("title",/(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(),ri=I(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g,Et).getRegex(),tt="address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul",Lt=/<!--(?:-?>|[\s\S]*?(?:-->|$))/,li=I("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))","i").replace("comment",Lt).replace("tag",tt).replace("attribute",/ +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(),Ts=I(Tt).replace("hr",Be).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("|table","").replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",tt).getRegex(),di=I(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph",Ts).getRegex(),$t={blockquote:di,code:ti,def:oi,fences:si,heading:ii,hr:Be,html:li,lheading:Es,list:ri,newline:ei,paragraph:Ts,table:je,text:ni},gs=I("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr",Be).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("blockquote"," {0,3}>").replace("code","(?: {4}| {0,3}	)[^\\n]").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",tt).getRegex(),ci={...$t,lheading:ai,table:gs,paragraph:I(Tt).replace("hr",Be).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("table",gs).replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",tt).getRegex()},pi={...$t,html:I(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment",Lt).replace(/tag/g,"(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,heading:/^(#{1,6})(.*)(?:\n+|$)/,fences:je,lheading:/^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,paragraph:I(Tt).replace("hr",Be).replace("heading",` *#{1,6} *[^
]`).replace("lheading",Es).replace("|table","").replace("blockquote"," {0,3}>").replace("|fences","").replace("|list","").replace("|html","").replace("|tag","").getRegex()},mi=/^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,ui=/^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,Ss=/^( {2,}|\\)\n(?!\s*$)/,hi=/^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,st=/[\p{P}\p{S}]/u,Mt=/[\s\p{P}\p{S}]/u,Ls=/[^\s\p{P}\p{S}]/u,gi=I(/^((?![*_])punctSpace)/,"u").replace(/punctSpace/g,Mt).getRegex(),$s=/(?!~)[\p{P}\p{S}]/u,fi=/(?!~)[\s\p{P}\p{S}]/u,bi=/(?:[^\s\p{P}\p{S}]|~)/u,vi=I(/link|precode-code|html/,"g").replace("link",/\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-",Qs?"(?<!`)()":"(^^|[^`])").replace("code",/(?<b>`+)[^`]+\k<b>(?!`)/).replace("html",/<(?! )[^<>]*?>/).getRegex(),Ms=/^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/,xi=I(Ms,"u").replace(/punct/g,st).getRegex(),yi=I(Ms,"u").replace(/punct/g,$s).getRegex(),zs="^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)",wi=I(zs,"gu").replace(/notPunctSpace/g,Ls).replace(/punctSpace/g,Mt).replace(/punct/g,st).getRegex(),ki=I(zs,"gu").replace(/notPunctSpace/g,bi).replace(/punctSpace/g,fi).replace(/punct/g,$s).getRegex(),Ei=I("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)","gu").replace(/notPunctSpace/g,Ls).replace(/punctSpace/g,Mt).replace(/punct/g,st).getRegex(),Ti=I(/\\(punct)/,"gu").replace(/punct/g,st).getRegex(),Si=I(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme",/[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email",/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(),Li=I(Lt).replace("(?:-->|$)","-->").getRegex(),$i=I("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment",Li).replace("attribute",/\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(),Ze=/(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+[^`]*?`+(?!`)|[^\[\]\\`])*?/,Mi=I(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]*(?:\n[ \t]*)?)(title))?\s*\)/).replace("label",Ze).replace("href",/<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title",/"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(),As=I(/^!?\[(label)\]\[(ref)\]/).replace("label",Ze).replace("ref",St).getRegex(),Is=I(/^!?\[(ref)\](?:\[\])?/).replace("ref",St).getRegex(),zi=I("reflink|nolink(?!\\()","g").replace("reflink",As).replace("nolink",Is).getRegex(),fs=/[hH][tT][tT][pP][sS]?|[fF][tT][pP]/,zt={_backpedal:je,anyPunctuation:Ti,autolink:Si,blockSkip:vi,br:Ss,code:ui,del:je,emStrongLDelim:xi,emStrongRDelimAst:wi,emStrongRDelimUnd:Ei,escape:mi,link:Mi,nolink:Is,punctuation:gi,reflink:As,reflinkSearch:zi,tag:$i,text:hi,url:je},Ai={...zt,link:I(/^!?\[(label)\]\((.*?)\)/).replace("label",Ze).getRegex(),reflink:I(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label",Ze).getRegex()},xt={...zt,emStrongRDelimAst:ki,emStrongLDelim:yi,url:I(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol",fs).replace("email",/[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),_backpedal:/(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,del:/^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/,text:I(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol",fs).getRegex()},Ii={...xt,br:I(Ss).replace("{2,}","*").getRegex(),text:I(xt.text).replace("\\b_","\\b_| {2,}\\n").replace(/\{2,\}/g,"*").getRegex()},Ke={normal:$t,gfm:ci,pedantic:pi},_e={normal:zt,gfm:xt,breaks:Ii,pedantic:Ai},_i={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},bs=d=>_i[d];function ue(d,e){if(e){if(q.escapeTest.test(d))return d.replace(q.escapeReplace,bs)}else if(q.escapeTestNoEncode.test(d))return d.replace(q.escapeReplaceNoEncode,bs);return d}function vs(d){try{d=encodeURI(d).replace(q.percentDecode,"%")}catch{return null}return d}function xs(d,e){let t=d.replace(q.findPipe,(a,n,l)=>{let o=!1,r=n;for(;--r>=0&&l[r]==="\\";)o=!o;return o?"|":" |"}),s=t.split(q.splitPipe),i=0;if(s[0].trim()||s.shift(),s.length>0&&!s.at(-1)?.trim()&&s.pop(),e)if(s.length>e)s.splice(e);else for(;s.length<e;)s.push("");for(;i<s.length;i++)s[i]=s[i].trim().replace(q.slashPipe,"|");return s}function Ce(d,e,t){let s=d.length;if(s===0)return"";let i=0;for(;i<s;){let a=d.charAt(s-i-1);if(a===e&&!t)i++;else if(a!==e&&t)i++;else break}return d.slice(0,s-i)}function Ci(d,e){if(d.indexOf(e[1])===-1)return-1;let t=0;for(let s=0;s<d.length;s++)if(d[s]==="\\")s++;else if(d[s]===e[0])t++;else if(d[s]===e[1]&&(t--,t<0))return s;return t>0?-2:-1}function ys(d,e,t,s,i){let a=e.href,n=e.title||null,l=d[1].replace(i.other.outputLinkReplace,"$1");s.state.inLink=!0;let o={type:d[0].charAt(0)==="!"?"image":"link",raw:t,href:a,title:n,text:l,tokens:s.inlineTokens(l)};return s.state.inLink=!1,o}function Hi(d,e,t){let s=d.match(t.other.indentCodeCompensation);if(s===null)return e;let i=s[1];return e.split(`
`).map(a=>{let n=a.match(t.other.beginningSpace);if(n===null)return a;let[l]=n;return l.length>=i.length?a.slice(i.length):a}).join(`
`)}var Qe=class{options;rules;lexer;constructor(d){this.options=d||ye}space(d){let e=this.rules.block.newline.exec(d);if(e&&e[0].length>0)return{type:"space",raw:e[0]}}code(d){let e=this.rules.block.code.exec(d);if(e){let t=e[0].replace(this.rules.other.codeRemoveIndent,"");return{type:"code",raw:e[0],codeBlockStyle:"indented",text:this.options.pedantic?t:Ce(t,`
`)}}}fences(d){let e=this.rules.block.fences.exec(d);if(e){let t=e[0],s=Hi(t,e[3]||"",this.rules);return{type:"code",raw:t,lang:e[2]?e[2].trim().replace(this.rules.inline.anyPunctuation,"$1"):e[2],text:s}}}heading(d){let e=this.rules.block.heading.exec(d);if(e){let t=e[2].trim();if(this.rules.other.endingHash.test(t)){let s=Ce(t,"#");(this.options.pedantic||!s||this.rules.other.endingSpaceChar.test(s))&&(t=s.trim())}return{type:"heading",raw:e[0],depth:e[1].length,text:t,tokens:this.lexer.inline(t)}}}hr(d){let e=this.rules.block.hr.exec(d);if(e)return{type:"hr",raw:Ce(e[0],`
`)}}blockquote(d){let e=this.rules.block.blockquote.exec(d);if(e){let t=Ce(e[0],`
`).split(`
`),s="",i="",a=[];for(;t.length>0;){let n=!1,l=[],o;for(o=0;o<t.length;o++)if(this.rules.other.blockquoteStart.test(t[o]))l.push(t[o]),n=!0;else if(!n)l.push(t[o]);else break;t=t.slice(o);let r=l.join(`
`),c=r.replace(this.rules.other.blockquoteSetextReplace,`
    $1`).replace(this.rules.other.blockquoteSetextReplace2,"");s=s?`${s}
${r}`:r,i=i?`${i}
${c}`:c;let m=this.lexer.state.top;if(this.lexer.state.top=!0,this.lexer.blockTokens(c,a,!0),this.lexer.state.top=m,t.length===0)break;let f=a.at(-1);if(f?.type==="code")break;if(f?.type==="blockquote"){let b=f,u=b.raw+`
`+t.join(`
`),h=this.blockquote(u);a[a.length-1]=h,s=s.substring(0,s.length-b.raw.length)+h.raw,i=i.substring(0,i.length-b.text.length)+h.text;break}else if(f?.type==="list"){let b=f,u=b.raw+`
`+t.join(`
`),h=this.list(u);a[a.length-1]=h,s=s.substring(0,s.length-f.raw.length)+h.raw,i=i.substring(0,i.length-b.raw.length)+h.raw,t=u.substring(a.at(-1).raw.length).split(`
`);continue}}return{type:"blockquote",raw:s,tokens:a,text:i}}}list(d){let e=this.rules.block.list.exec(d);if(e){let t=e[1].trim(),s=t.length>1,i={type:"list",raw:"",ordered:s,start:s?+t.slice(0,-1):"",loose:!1,items:[]};t=s?`\\d{1,9}\\${t.slice(-1)}`:`\\${t}`,this.options.pedantic&&(t=s?t:"[*+-]");let a=this.rules.other.listItemRegex(t),n=!1;for(;d;){let o=!1,r="",c="";if(!(e=a.exec(d))||this.rules.block.hr.test(d))break;r=e[0],d=d.substring(r.length);let m=e[2].split(`
`,1)[0].replace(this.rules.other.listReplaceTabs,h=>" ".repeat(3*h.length)),f=d.split(`
`,1)[0],b=!m.trim(),u=0;if(this.options.pedantic?(u=2,c=m.trimStart()):b?u=e[1].length+1:(u=e[2].search(this.rules.other.nonSpaceChar),u=u>4?1:u,c=m.slice(u),u+=e[1].length),b&&this.rules.other.blankLine.test(f)&&(r+=f+`
`,d=d.substring(f.length+1),o=!0),!o){let h=this.rules.other.nextBulletRegex(u),v=this.rules.other.hrRegex(u),y=this.rules.other.fencesBeginRegex(u),w=this.rules.other.headingBeginRegex(u),k=this.rules.other.htmlBeginRegex(u);for(;d;){let S=d.split(`
`,1)[0],L;if(f=S,this.options.pedantic?(f=f.replace(this.rules.other.listReplaceNesting,"  "),L=f):L=f.replace(this.rules.other.tabCharGlobal,"    "),y.test(f)||w.test(f)||k.test(f)||h.test(f)||v.test(f))break;if(L.search(this.rules.other.nonSpaceChar)>=u||!f.trim())c+=`
`+L.slice(u);else{if(b||m.replace(this.rules.other.tabCharGlobal,"    ").search(this.rules.other.nonSpaceChar)>=4||y.test(m)||w.test(m)||v.test(m))break;c+=`
`+f}!b&&!f.trim()&&(b=!0),r+=S+`
`,d=d.substring(S.length+1),m=L.slice(u)}}i.loose||(n?i.loose=!0:this.rules.other.doubleBlankLine.test(r)&&(n=!0)),i.items.push({type:"list_item",raw:r,task:!!this.options.gfm&&this.rules.other.listIsTask.test(c),loose:!1,text:c,tokens:[]}),i.raw+=r}let l=i.items.at(-1);if(l)l.raw=l.raw.trimEnd(),l.text=l.text.trimEnd();else return;i.raw=i.raw.trimEnd();for(let o of i.items){if(this.lexer.state.top=!1,o.tokens=this.lexer.blockTokens(o.text,[]),o.task){if(o.text=o.text.replace(this.rules.other.listReplaceTask,""),o.tokens[0]?.type==="text"||o.tokens[0]?.type==="paragraph"){o.tokens[0].raw=o.tokens[0].raw.replace(this.rules.other.listReplaceTask,""),o.tokens[0].text=o.tokens[0].text.replace(this.rules.other.listReplaceTask,"");for(let c=this.lexer.inlineQueue.length-1;c>=0;c--)if(this.rules.other.listIsTask.test(this.lexer.inlineQueue[c].src)){this.lexer.inlineQueue[c].src=this.lexer.inlineQueue[c].src.replace(this.rules.other.listReplaceTask,"");break}}let r=this.rules.other.listTaskCheckbox.exec(o.raw);if(r){let c={type:"checkbox",raw:r[0]+" ",checked:r[0]!=="[ ]"};o.checked=c.checked,i.loose?o.tokens[0]&&["paragraph","text"].includes(o.tokens[0].type)&&"tokens"in o.tokens[0]&&o.tokens[0].tokens?(o.tokens[0].raw=c.raw+o.tokens[0].raw,o.tokens[0].text=c.raw+o.tokens[0].text,o.tokens[0].tokens.unshift(c)):o.tokens.unshift({type:"paragraph",raw:c.raw,text:c.raw,tokens:[c]}):o.tokens.unshift(c)}}if(!i.loose){let r=o.tokens.filter(m=>m.type==="space"),c=r.length>0&&r.some(m=>this.rules.other.anyLine.test(m.raw));i.loose=c}}if(i.loose)for(let o of i.items){o.loose=!0;for(let r of o.tokens)r.type==="text"&&(r.type="paragraph")}return i}}html(d){let e=this.rules.block.html.exec(d);if(e)return{type:"html",block:!0,raw:e[0],pre:e[1]==="pre"||e[1]==="script"||e[1]==="style",text:e[0]}}def(d){let e=this.rules.block.def.exec(d);if(e){let t=e[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal," "),s=e[2]?e[2].replace(this.rules.other.hrefBrackets,"$1").replace(this.rules.inline.anyPunctuation,"$1"):"",i=e[3]?e[3].substring(1,e[3].length-1).replace(this.rules.inline.anyPunctuation,"$1"):e[3];return{type:"def",tag:t,raw:e[0],href:s,title:i}}}table(d){let e=this.rules.block.table.exec(d);if(!e||!this.rules.other.tableDelimiter.test(e[2]))return;let t=xs(e[1]),s=e[2].replace(this.rules.other.tableAlignChars,"").split("|"),i=e[3]?.trim()?e[3].replace(this.rules.other.tableRowBlankLine,"").split(`
`):[],a={type:"table",raw:e[0],header:[],align:[],rows:[]};if(t.length===s.length){for(let n of s)this.rules.other.tableAlignRight.test(n)?a.align.push("right"):this.rules.other.tableAlignCenter.test(n)?a.align.push("center"):this.rules.other.tableAlignLeft.test(n)?a.align.push("left"):a.align.push(null);for(let n=0;n<t.length;n++)a.header.push({text:t[n],tokens:this.lexer.inline(t[n]),header:!0,align:a.align[n]});for(let n of i)a.rows.push(xs(n,a.header.length).map((l,o)=>({text:l,tokens:this.lexer.inline(l),header:!1,align:a.align[o]})));return a}}lheading(d){let e=this.rules.block.lheading.exec(d);if(e)return{type:"heading",raw:e[0],depth:e[2].charAt(0)==="="?1:2,text:e[1],tokens:this.lexer.inline(e[1])}}paragraph(d){let e=this.rules.block.paragraph.exec(d);if(e){let t=e[1].charAt(e[1].length-1)===`
`?e[1].slice(0,-1):e[1];return{type:"paragraph",raw:e[0],text:t,tokens:this.lexer.inline(t)}}}text(d){let e=this.rules.block.text.exec(d);if(e)return{type:"text",raw:e[0],text:e[0],tokens:this.lexer.inline(e[0])}}escape(d){let e=this.rules.inline.escape.exec(d);if(e)return{type:"escape",raw:e[0],text:e[1]}}tag(d){let e=this.rules.inline.tag.exec(d);if(e)return!this.lexer.state.inLink&&this.rules.other.startATag.test(e[0])?this.lexer.state.inLink=!0:this.lexer.state.inLink&&this.rules.other.endATag.test(e[0])&&(this.lexer.state.inLink=!1),!this.lexer.state.inRawBlock&&this.rules.other.startPreScriptTag.test(e[0])?this.lexer.state.inRawBlock=!0:this.lexer.state.inRawBlock&&this.rules.other.endPreScriptTag.test(e[0])&&(this.lexer.state.inRawBlock=!1),{type:"html",raw:e[0],inLink:this.lexer.state.inLink,inRawBlock:this.lexer.state.inRawBlock,block:!1,text:e[0]}}link(d){let e=this.rules.inline.link.exec(d);if(e){let t=e[2].trim();if(!this.options.pedantic&&this.rules.other.startAngleBracket.test(t)){if(!this.rules.other.endAngleBracket.test(t))return;let a=Ce(t.slice(0,-1),"\\");if((t.length-a.length)%2===0)return}else{let a=Ci(e[2],"()");if(a===-2)return;if(a>-1){let n=(e[0].indexOf("!")===0?5:4)+e[1].length+a;e[2]=e[2].substring(0,a),e[0]=e[0].substring(0,n).trim(),e[3]=""}}let s=e[2],i="";if(this.options.pedantic){let a=this.rules.other.pedanticHrefTitle.exec(s);a&&(s=a[1],i=a[3])}else i=e[3]?e[3].slice(1,-1):"";return s=s.trim(),this.rules.other.startAngleBracket.test(s)&&(this.options.pedantic&&!this.rules.other.endAngleBracket.test(t)?s=s.slice(1):s=s.slice(1,-1)),ys(e,{href:s&&s.replace(this.rules.inline.anyPunctuation,"$1"),title:i&&i.replace(this.rules.inline.anyPunctuation,"$1")},e[0],this.lexer,this.rules)}}reflink(d,e){let t;if((t=this.rules.inline.reflink.exec(d))||(t=this.rules.inline.nolink.exec(d))){let s=(t[2]||t[1]).replace(this.rules.other.multipleSpaceGlobal," "),i=e[s.toLowerCase()];if(!i){let a=t[0].charAt(0);return{type:"text",raw:a,text:a}}return ys(t,i,t[0],this.lexer,this.rules)}}emStrong(d,e,t=""){let s=this.rules.inline.emStrongLDelim.exec(d);if(!(!s||s[3]&&t.match(this.rules.other.unicodeAlphaNumeric))&&(!(s[1]||s[2])||!t||this.rules.inline.punctuation.exec(t))){let i=[...s[0]].length-1,a,n,l=i,o=0,r=s[0][0]==="*"?this.rules.inline.emStrongRDelimAst:this.rules.inline.emStrongRDelimUnd;for(r.lastIndex=0,e=e.slice(-1*d.length+i);(s=r.exec(e))!=null;){if(a=s[1]||s[2]||s[3]||s[4]||s[5]||s[6],!a)continue;if(n=[...a].length,s[3]||s[4]){l+=n;continue}else if((s[5]||s[6])&&i%3&&!((i+n)%3)){o+=n;continue}if(l-=n,l>0)continue;n=Math.min(n,n+l+o);let c=[...s[0]][0].length,m=d.slice(0,i+s.index+c+n);if(Math.min(i,n)%2){let b=m.slice(1,-1);return{type:"em",raw:m,text:b,tokens:this.lexer.inlineTokens(b)}}let f=m.slice(2,-2);return{type:"strong",raw:m,text:f,tokens:this.lexer.inlineTokens(f)}}}}codespan(d){let e=this.rules.inline.code.exec(d);if(e){let t=e[2].replace(this.rules.other.newLineCharGlobal," "),s=this.rules.other.nonSpaceChar.test(t),i=this.rules.other.startingSpaceChar.test(t)&&this.rules.other.endingSpaceChar.test(t);return s&&i&&(t=t.substring(1,t.length-1)),{type:"codespan",raw:e[0],text:t}}}br(d){let e=this.rules.inline.br.exec(d);if(e)return{type:"br",raw:e[0]}}del(d){let e=this.rules.inline.del.exec(d);if(e)return{type:"del",raw:e[0],text:e[2],tokens:this.lexer.inlineTokens(e[2])}}autolink(d){let e=this.rules.inline.autolink.exec(d);if(e){let t,s;return e[2]==="@"?(t=e[1],s="mailto:"+t):(t=e[1],s=t),{type:"link",raw:e[0],text:t,href:s,tokens:[{type:"text",raw:t,text:t}]}}}url(d){let e;if(e=this.rules.inline.url.exec(d)){let t,s;if(e[2]==="@")t=e[0],s="mailto:"+t;else{let i;do i=e[0],e[0]=this.rules.inline._backpedal.exec(e[0])?.[0]??"";while(i!==e[0]);t=e[0],e[1]==="www."?s="http://"+e[0]:s=e[0]}return{type:"link",raw:e[0],text:t,href:s,tokens:[{type:"text",raw:t,text:t}]}}}inlineText(d){let e=this.rules.inline.text.exec(d);if(e){let t=this.lexer.state.inRawBlock;return{type:"text",raw:e[0],text:e[0],escaped:t}}}},te=class yt{tokens;options;state;inlineQueue;tokenizer;constructor(e){this.tokens=[],this.tokens.links=Object.create(null),this.options=e||ye,this.options.tokenizer=this.options.tokenizer||new Qe,this.tokenizer=this.options.tokenizer,this.tokenizer.options=this.options,this.tokenizer.lexer=this,this.inlineQueue=[],this.state={inLink:!1,inRawBlock:!1,top:!0};let t={other:q,block:Ke.normal,inline:_e.normal};this.options.pedantic?(t.block=Ke.pedantic,t.inline=_e.pedantic):this.options.gfm&&(t.block=Ke.gfm,this.options.breaks?t.inline=_e.breaks:t.inline=_e.gfm),this.tokenizer.rules=t}static get rules(){return{block:Ke,inline:_e}}static lex(e,t){return new yt(t).lex(e)}static lexInline(e,t){return new yt(t).inlineTokens(e)}lex(e){e=e.replace(q.carriageReturn,`
`),this.blockTokens(e,this.tokens);for(let t=0;t<this.inlineQueue.length;t++){let s=this.inlineQueue[t];this.inlineTokens(s.src,s.tokens)}return this.inlineQueue=[],this.tokens}blockTokens(e,t=[],s=!1){for(this.options.pedantic&&(e=e.replace(q.tabCharGlobal,"    ").replace(q.spaceLine,""));e;){let i;if(this.options.extensions?.block?.some(n=>(i=n.call({lexer:this},e,t))?(e=e.substring(i.raw.length),t.push(i),!0):!1))continue;if(i=this.tokenizer.space(e)){e=e.substring(i.raw.length);let n=t.at(-1);i.raw.length===1&&n!==void 0?n.raw+=`
`:t.push(i);continue}if(i=this.tokenizer.code(e)){e=e.substring(i.raw.length);let n=t.at(-1);n?.type==="paragraph"||n?.type==="text"?(n.raw+=(n.raw.endsWith(`
`)?"":`
`)+i.raw,n.text+=`
`+i.text,this.inlineQueue.at(-1).src=n.text):t.push(i);continue}if(i=this.tokenizer.fences(e)){e=e.substring(i.raw.length),t.push(i);continue}if(i=this.tokenizer.heading(e)){e=e.substring(i.raw.length),t.push(i);continue}if(i=this.tokenizer.hr(e)){e=e.substring(i.raw.length),t.push(i);continue}if(i=this.tokenizer.blockquote(e)){e=e.substring(i.raw.length),t.push(i);continue}if(i=this.tokenizer.list(e)){e=e.substring(i.raw.length),t.push(i);continue}if(i=this.tokenizer.html(e)){e=e.substring(i.raw.length),t.push(i);continue}if(i=this.tokenizer.def(e)){e=e.substring(i.raw.length);let n=t.at(-1);n?.type==="paragraph"||n?.type==="text"?(n.raw+=(n.raw.endsWith(`
`)?"":`
`)+i.raw,n.text+=`
`+i.raw,this.inlineQueue.at(-1).src=n.text):this.tokens.links[i.tag]||(this.tokens.links[i.tag]={href:i.href,title:i.title},t.push(i));continue}if(i=this.tokenizer.table(e)){e=e.substring(i.raw.length),t.push(i);continue}if(i=this.tokenizer.lheading(e)){e=e.substring(i.raw.length),t.push(i);continue}let a=e;if(this.options.extensions?.startBlock){let n=1/0,l=e.slice(1),o;this.options.extensions.startBlock.forEach(r=>{o=r.call({lexer:this},l),typeof o=="number"&&o>=0&&(n=Math.min(n,o))}),n<1/0&&n>=0&&(a=e.substring(0,n+1))}if(this.state.top&&(i=this.tokenizer.paragraph(a))){let n=t.at(-1);s&&n?.type==="paragraph"?(n.raw+=(n.raw.endsWith(`
`)?"":`
`)+i.raw,n.text+=`
`+i.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=n.text):t.push(i),s=a.length!==e.length,e=e.substring(i.raw.length);continue}if(i=this.tokenizer.text(e)){e=e.substring(i.raw.length);let n=t.at(-1);n?.type==="text"?(n.raw+=(n.raw.endsWith(`
`)?"":`
`)+i.raw,n.text+=`
`+i.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=n.text):t.push(i);continue}if(e){let n="Infinite loop on byte: "+e.charCodeAt(0);if(this.options.silent){console.error(n);break}else throw new Error(n)}}return this.state.top=!0,t}inline(e,t=[]){return this.inlineQueue.push({src:e,tokens:t}),t}inlineTokens(e,t=[]){let s=e,i=null;if(this.tokens.links){let o=Object.keys(this.tokens.links);if(o.length>0)for(;(i=this.tokenizer.rules.inline.reflinkSearch.exec(s))!=null;)o.includes(i[0].slice(i[0].lastIndexOf("[")+1,-1))&&(s=s.slice(0,i.index)+"["+"a".repeat(i[0].length-2)+"]"+s.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex))}for(;(i=this.tokenizer.rules.inline.anyPunctuation.exec(s))!=null;)s=s.slice(0,i.index)+"++"+s.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);let a;for(;(i=this.tokenizer.rules.inline.blockSkip.exec(s))!=null;)a=i[2]?i[2].length:0,s=s.slice(0,i.index+a)+"["+"a".repeat(i[0].length-a-2)+"]"+s.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);s=this.options.hooks?.emStrongMask?.call({lexer:this},s)??s;let n=!1,l="";for(;e;){n||(l=""),n=!1;let o;if(this.options.extensions?.inline?.some(c=>(o=c.call({lexer:this},e,t))?(e=e.substring(o.raw.length),t.push(o),!0):!1))continue;if(o=this.tokenizer.escape(e)){e=e.substring(o.raw.length),t.push(o);continue}if(o=this.tokenizer.tag(e)){e=e.substring(o.raw.length),t.push(o);continue}if(o=this.tokenizer.link(e)){e=e.substring(o.raw.length),t.push(o);continue}if(o=this.tokenizer.reflink(e,this.tokens.links)){e=e.substring(o.raw.length);let c=t.at(-1);o.type==="text"&&c?.type==="text"?(c.raw+=o.raw,c.text+=o.text):t.push(o);continue}if(o=this.tokenizer.emStrong(e,s,l)){e=e.substring(o.raw.length),t.push(o);continue}if(o=this.tokenizer.codespan(e)){e=e.substring(o.raw.length),t.push(o);continue}if(o=this.tokenizer.br(e)){e=e.substring(o.raw.length),t.push(o);continue}if(o=this.tokenizer.del(e)){e=e.substring(o.raw.length),t.push(o);continue}if(o=this.tokenizer.autolink(e)){e=e.substring(o.raw.length),t.push(o);continue}if(!this.state.inLink&&(o=this.tokenizer.url(e))){e=e.substring(o.raw.length),t.push(o);continue}let r=e;if(this.options.extensions?.startInline){let c=1/0,m=e.slice(1),f;this.options.extensions.startInline.forEach(b=>{f=b.call({lexer:this},m),typeof f=="number"&&f>=0&&(c=Math.min(c,f))}),c<1/0&&c>=0&&(r=e.substring(0,c+1))}if(o=this.tokenizer.inlineText(r)){e=e.substring(o.raw.length),o.raw.slice(-1)!=="_"&&(l=o.raw.slice(-1)),n=!0;let c=t.at(-1);c?.type==="text"?(c.raw+=o.raw,c.text+=o.text):t.push(o);continue}if(e){let c="Infinite loop on byte: "+e.charCodeAt(0);if(this.options.silent){console.error(c);break}else throw new Error(c)}}return t}},et=class{options;parser;constructor(d){this.options=d||ye}space(d){return""}code({text:d,lang:e,escaped:t}){let s=(e||"").match(q.notSpaceStart)?.[0],i=d.replace(q.endingNewline,"")+`
`;return s?'<pre><code class="language-'+ue(s)+'">'+(t?i:ue(i,!0))+`</code></pre>
`:"<pre><code>"+(t?i:ue(i,!0))+`</code></pre>
`}blockquote({tokens:d}){return`<blockquote>
${this.parser.parse(d)}</blockquote>
`}html({text:d}){return d}def(d){return""}heading({tokens:d,depth:e}){return`<h${e}>${this.parser.parseInline(d)}</h${e}>
`}hr(d){return`<hr>
`}list(d){let e=d.ordered,t=d.start,s="";for(let n=0;n<d.items.length;n++){let l=d.items[n];s+=this.listitem(l)}let i=e?"ol":"ul",a=e&&t!==1?' start="'+t+'"':"";return"<"+i+a+`>
`+s+"</"+i+`>
`}listitem(d){return`<li>${this.parser.parse(d.tokens)}</li>
`}checkbox({checked:d}){return"<input "+(d?'checked="" ':"")+'disabled="" type="checkbox"> '}paragraph({tokens:d}){return`<p>${this.parser.parseInline(d)}</p>
`}table(d){let e="",t="";for(let i=0;i<d.header.length;i++)t+=this.tablecell(d.header[i]);e+=this.tablerow({text:t});let s="";for(let i=0;i<d.rows.length;i++){let a=d.rows[i];t="";for(let n=0;n<a.length;n++)t+=this.tablecell(a[n]);s+=this.tablerow({text:t})}return s&&(s=`<tbody>${s}</tbody>`),`<table>
<thead>
`+e+`</thead>
`+s+`</table>
`}tablerow({text:d}){return`<tr>
${d}</tr>
`}tablecell(d){let e=this.parser.parseInline(d.tokens),t=d.header?"th":"td";return(d.align?`<${t} align="${d.align}">`:`<${t}>`)+e+`</${t}>
`}strong({tokens:d}){return`<strong>${this.parser.parseInline(d)}</strong>`}em({tokens:d}){return`<em>${this.parser.parseInline(d)}</em>`}codespan({text:d}){return`<code>${ue(d,!0)}</code>`}br(d){return"<br>"}del({tokens:d}){return`<del>${this.parser.parseInline(d)}</del>`}link({href:d,title:e,tokens:t}){let s=this.parser.parseInline(t),i=vs(d);if(i===null)return s;d=i;let a='<a href="'+d+'"';return e&&(a+=' title="'+ue(e)+'"'),a+=">"+s+"</a>",a}image({href:d,title:e,text:t,tokens:s}){s&&(t=this.parser.parseInline(s,this.parser.textRenderer));let i=vs(d);if(i===null)return ue(t);d=i;let a=`<img src="${d}" alt="${t}"`;return e&&(a+=` title="${ue(e)}"`),a+=">",a}text(d){return"tokens"in d&&d.tokens?this.parser.parseInline(d.tokens):"escaped"in d&&d.escaped?d.text:ue(d.text)}},At=class{strong({text:d}){return d}em({text:d}){return d}codespan({text:d}){return d}del({text:d}){return d}html({text:d}){return d}text({text:d}){return d}link({text:d}){return""+d}image({text:d}){return""+d}br(){return""}checkbox({raw:d}){return d}},se=class wt{options;renderer;textRenderer;constructor(e){this.options=e||ye,this.options.renderer=this.options.renderer||new et,this.renderer=this.options.renderer,this.renderer.options=this.options,this.renderer.parser=this,this.textRenderer=new At}static parse(e,t){return new wt(t).parse(e)}static parseInline(e,t){return new wt(t).parseInline(e)}parse(e){let t="";for(let s=0;s<e.length;s++){let i=e[s];if(this.options.extensions?.renderers?.[i.type]){let n=i,l=this.options.extensions.renderers[n.type].call({parser:this},n);if(l!==!1||!["space","hr","heading","code","table","blockquote","list","html","def","paragraph","text"].includes(n.type)){t+=l||"";continue}}let a=i;switch(a.type){case"space":{t+=this.renderer.space(a);break}case"hr":{t+=this.renderer.hr(a);break}case"heading":{t+=this.renderer.heading(a);break}case"code":{t+=this.renderer.code(a);break}case"table":{t+=this.renderer.table(a);break}case"blockquote":{t+=this.renderer.blockquote(a);break}case"list":{t+=this.renderer.list(a);break}case"checkbox":{t+=this.renderer.checkbox(a);break}case"html":{t+=this.renderer.html(a);break}case"def":{t+=this.renderer.def(a);break}case"paragraph":{t+=this.renderer.paragraph(a);break}case"text":{t+=this.renderer.text(a);break}default:{let n='Token with "'+a.type+'" type was not found.';if(this.options.silent)return console.error(n),"";throw new Error(n)}}}return t}parseInline(e,t=this.renderer){let s="";for(let i=0;i<e.length;i++){let a=e[i];if(this.options.extensions?.renderers?.[a.type]){let l=this.options.extensions.renderers[a.type].call({parser:this},a);if(l!==!1||!["escape","html","link","image","strong","em","codespan","br","del","text"].includes(a.type)){s+=l||"";continue}}let n=a;switch(n.type){case"escape":{s+=t.text(n);break}case"html":{s+=t.html(n);break}case"link":{s+=t.link(n);break}case"image":{s+=t.image(n);break}case"checkbox":{s+=t.checkbox(n);break}case"strong":{s+=t.strong(n);break}case"em":{s+=t.em(n);break}case"codespan":{s+=t.codespan(n);break}case"br":{s+=t.br(n);break}case"del":{s+=t.del(n);break}case"text":{s+=t.text(n);break}default:{let l='Token with "'+n.type+'" type was not found.';if(this.options.silent)return console.error(l),"";throw new Error(l)}}}return s}},He=class{options;block;constructor(d){this.options=d||ye}static passThroughHooks=new Set(["preprocess","postprocess","processAllTokens","emStrongMask"]);static passThroughHooksRespectAsync=new Set(["preprocess","postprocess","processAllTokens"]);preprocess(d){return d}postprocess(d){return d}processAllTokens(d){return d}emStrongMask(d){return d}provideLexer(){return this.block?te.lex:te.lexInline}provideParser(){return this.block?se.parse:se.parseInline}},ji=class{defaults=kt();options=this.setOptions;parse=this.parseMarkdown(!0);parseInline=this.parseMarkdown(!1);Parser=se;Renderer=et;TextRenderer=At;Lexer=te;Tokenizer=Qe;Hooks=He;constructor(...d){this.use(...d)}walkTokens(d,e){let t=[];for(let s of d)switch(t=t.concat(e.call(this,s)),s.type){case"table":{let i=s;for(let a of i.header)t=t.concat(this.walkTokens(a.tokens,e));for(let a of i.rows)for(let n of a)t=t.concat(this.walkTokens(n.tokens,e));break}case"list":{let i=s;t=t.concat(this.walkTokens(i.items,e));break}default:{let i=s;this.defaults.extensions?.childTokens?.[i.type]?this.defaults.extensions.childTokens[i.type].forEach(a=>{let n=i[a].flat(1/0);t=t.concat(this.walkTokens(n,e))}):i.tokens&&(t=t.concat(this.walkTokens(i.tokens,e)))}}return t}use(...d){let e=this.defaults.extensions||{renderers:{},childTokens:{}};return d.forEach(t=>{let s={...t};if(s.async=this.defaults.async||s.async||!1,t.extensions&&(t.extensions.forEach(i=>{if(!i.name)throw new Error("extension name required");if("renderer"in i){let a=e.renderers[i.name];a?e.renderers[i.name]=function(...n){let l=i.renderer.apply(this,n);return l===!1&&(l=a.apply(this,n)),l}:e.renderers[i.name]=i.renderer}if("tokenizer"in i){if(!i.level||i.level!=="block"&&i.level!=="inline")throw new Error("extension level must be 'block' or 'inline'");let a=e[i.level];a?a.unshift(i.tokenizer):e[i.level]=[i.tokenizer],i.start&&(i.level==="block"?e.startBlock?e.startBlock.push(i.start):e.startBlock=[i.start]:i.level==="inline"&&(e.startInline?e.startInline.push(i.start):e.startInline=[i.start]))}"childTokens"in i&&i.childTokens&&(e.childTokens[i.name]=i.childTokens)}),s.extensions=e),t.renderer){let i=this.defaults.renderer||new et(this.defaults);for(let a in t.renderer){if(!(a in i))throw new Error(`renderer '${a}' does not exist`);if(["options","parser"].includes(a))continue;let n=a,l=t.renderer[n],o=i[n];i[n]=(...r)=>{let c=l.apply(i,r);return c===!1&&(c=o.apply(i,r)),c||""}}s.renderer=i}if(t.tokenizer){let i=this.defaults.tokenizer||new Qe(this.defaults);for(let a in t.tokenizer){if(!(a in i))throw new Error(`tokenizer '${a}' does not exist`);if(["options","rules","lexer"].includes(a))continue;let n=a,l=t.tokenizer[n],o=i[n];i[n]=(...r)=>{let c=l.apply(i,r);return c===!1&&(c=o.apply(i,r)),c}}s.tokenizer=i}if(t.hooks){let i=this.defaults.hooks||new He;for(let a in t.hooks){if(!(a in i))throw new Error(`hook '${a}' does not exist`);if(["options","block"].includes(a))continue;let n=a,l=t.hooks[n],o=i[n];He.passThroughHooks.has(a)?i[n]=r=>{if(this.defaults.async&&He.passThroughHooksRespectAsync.has(a))return(async()=>{let m=await l.call(i,r);return o.call(i,m)})();let c=l.call(i,r);return o.call(i,c)}:i[n]=(...r)=>{if(this.defaults.async)return(async()=>{let m=await l.apply(i,r);return m===!1&&(m=await o.apply(i,r)),m})();let c=l.apply(i,r);return c===!1&&(c=o.apply(i,r)),c}}s.hooks=i}if(t.walkTokens){let i=this.defaults.walkTokens,a=t.walkTokens;s.walkTokens=function(n){let l=[];return l.push(a.call(this,n)),i&&(l=l.concat(i.call(this,n))),l}}this.defaults={...this.defaults,...s}}),this}setOptions(d){return this.defaults={...this.defaults,...d},this}lexer(d,e){return te.lex(d,e??this.defaults)}parser(d,e){return se.parse(d,e??this.defaults)}parseMarkdown(d){return(e,t)=>{let s={...t},i={...this.defaults,...s},a=this.onError(!!i.silent,!!i.async);if(this.defaults.async===!0&&s.async===!1)return a(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));if(typeof e>"u"||e===null)return a(new Error("marked(): input parameter is undefined or null"));if(typeof e!="string")return a(new Error("marked(): input parameter is of type "+Object.prototype.toString.call(e)+", string expected"));if(i.hooks&&(i.hooks.options=i,i.hooks.block=d),i.async)return(async()=>{let n=i.hooks?await i.hooks.preprocess(e):e,l=await(i.hooks?await i.hooks.provideLexer():d?te.lex:te.lexInline)(n,i),o=i.hooks?await i.hooks.processAllTokens(l):l;i.walkTokens&&await Promise.all(this.walkTokens(o,i.walkTokens));let r=await(i.hooks?await i.hooks.provideParser():d?se.parse:se.parseInline)(o,i);return i.hooks?await i.hooks.postprocess(r):r})().catch(a);try{i.hooks&&(e=i.hooks.preprocess(e));let n=(i.hooks?i.hooks.provideLexer():d?te.lex:te.lexInline)(e,i);i.hooks&&(n=i.hooks.processAllTokens(n)),i.walkTokens&&this.walkTokens(n,i.walkTokens);let l=(i.hooks?i.hooks.provideParser():d?se.parse:se.parseInline)(n,i);return i.hooks&&(l=i.hooks.postprocess(l)),l}catch(n){return a(n)}}}onError(d,e){return t=>{if(t.message+=`
Please report this to https://github.com/markedjs/marked.`,d){let s="<p>An error occurred:</p><pre>"+ue(t.message+"",!0)+"</pre>";return e?Promise.resolve(s):s}if(e)return Promise.reject(t);throw t}}},xe=new ji;function _(d,e){return xe.parse(d,e)}_.options=_.setOptions=function(d){return xe.setOptions(d),_.defaults=xe.defaults,ws(_.defaults),_};_.getDefaults=kt;_.defaults=ye;_.use=function(...d){return xe.use(...d),_.defaults=xe.defaults,ws(_.defaults),_};_.walkTokens=function(d,e){return xe.walkTokens(d,e)};_.parseInline=xe.parseInline;_.Parser=se;_.parser=se.parse;_.Renderer=et;_.TextRenderer=At;_.Lexer=te;_.lexer=te.lex;_.Tokenizer=Qe;_.Hooks=He;_.parse=_;var la=_.options,da=_.setOptions,ca=_.use,pa=_.walkTokens,ma=_.parseInline;var ua=se.parse,ha=te.lex;var{entries:Ns,setPrototypeOf:_s,isFrozen:Bi,getPrototypeOf:Di,getOwnPropertyDescriptor:Pi}=Object,{freeze:W,seal:ee,create:Dt}=Object,{apply:Pt,construct:Rt}=typeof Reflect<"u"&&Reflect;W||(W=function(e){return e});ee||(ee=function(e){return e});Pt||(Pt=function(e,t){for(var s=arguments.length,i=new Array(s>2?s-2:0),a=2;a<s;a++)i[a-2]=arguments[a];return e.apply(t,i)});Rt||(Rt=function(e){for(var t=arguments.length,s=new Array(t>1?t-1:0),i=1;i<t;i++)s[i-1]=arguments[i];return new e(...s)});var it=Y(Array.prototype.forEach),Ri=Y(Array.prototype.lastIndexOf),Cs=Y(Array.prototype.pop),De=Y(Array.prototype.push),Ni=Y(Array.prototype.splice),nt=Y(String.prototype.toLowerCase),It=Y(String.prototype.toString),_t=Y(String.prototype.match),Pe=Y(String.prototype.replace),Oi=Y(String.prototype.indexOf),Fi=Y(String.prototype.trim),ie=Y(Object.prototype.hasOwnProperty),U=Y(RegExp.prototype.test),Re=Gi(TypeError);function Y(d){return function(e){e instanceof RegExp&&(e.lastIndex=0);for(var t=arguments.length,s=new Array(t>1?t-1:0),i=1;i<t;i++)s[i-1]=arguments[i];return Pt(d,e,s)}}function Gi(d){return function(){for(var e=arguments.length,t=new Array(e),s=0;s<e;s++)t[s]=arguments[s];return Rt(d,t)}}function A(d,e){let t=arguments.length>2&&arguments[2]!==void 0?arguments[2]:nt;_s&&_s(d,null);let s=e.length;for(;s--;){let i=e[s];if(typeof i=="string"){let a=t(i);a!==i&&(Bi(e)||(e[s]=a),i=a)}d[i]=!0}return d}function qi(d){for(let e=0;e<d.length;e++)ie(d,e)||(d[e]=null);return d}function re(d){let e=Dt(null);for(let[t,s]of Ns(d))ie(d,t)&&(Array.isArray(s)?e[t]=qi(s):s&&typeof s=="object"&&s.constructor===Object?e[t]=re(s):e[t]=s);return e}function Ne(d,e){for(;d!==null;){let s=Pi(d,e);if(s){if(s.get)return Y(s.get);if(typeof s.value=="function")return Y(s.value)}d=Di(d)}function t(){return null}return t}var Hs=W(["a","abbr","acronym","address","area","article","aside","audio","b","bdi","bdo","big","blink","blockquote","body","br","button","canvas","caption","center","cite","code","col","colgroup","content","data","datalist","dd","decorator","del","details","dfn","dialog","dir","div","dl","dt","element","em","fieldset","figcaption","figure","font","footer","form","h1","h2","h3","h4","h5","h6","head","header","hgroup","hr","html","i","img","input","ins","kbd","label","legend","li","main","map","mark","marquee","menu","menuitem","meter","nav","nobr","ol","optgroup","option","output","p","picture","pre","progress","q","rp","rt","ruby","s","samp","search","section","select","shadow","slot","small","source","spacer","span","strike","strong","style","sub","summary","sup","table","tbody","td","template","textarea","tfoot","th","thead","time","tr","track","tt","u","ul","var","video","wbr"]),Ct=W(["svg","a","altglyph","altglyphdef","altglyphitem","animatecolor","animatemotion","animatetransform","circle","clippath","defs","desc","ellipse","enterkeyhint","exportparts","filter","font","g","glyph","glyphref","hkern","image","inputmode","line","lineargradient","marker","mask","metadata","mpath","part","path","pattern","polygon","polyline","radialgradient","rect","stop","style","switch","symbol","text","textpath","title","tref","tspan","view","vkern"]),Ht=W(["feBlend","feColorMatrix","feComponentTransfer","feComposite","feConvolveMatrix","feDiffuseLighting","feDisplacementMap","feDistantLight","feDropShadow","feFlood","feFuncA","feFuncB","feFuncG","feFuncR","feGaussianBlur","feImage","feMerge","feMergeNode","feMorphology","feOffset","fePointLight","feSpecularLighting","feSpotLight","feTile","feTurbulence"]),Ui=W(["animate","color-profile","cursor","discard","font-face","font-face-format","font-face-name","font-face-src","font-face-uri","foreignobject","hatch","hatchpath","mesh","meshgradient","meshpatch","meshrow","missing-glyph","script","set","solidcolor","unknown","use"]),jt=W(["math","menclose","merror","mfenced","mfrac","mglyph","mi","mlabeledtr","mmultiscripts","mn","mo","mover","mpadded","mphantom","mroot","mrow","ms","mspace","msqrt","mstyle","msub","msup","msubsup","mtable","mtd","mtext","mtr","munder","munderover","mprescripts"]),Wi=W(["maction","maligngroup","malignmark","mlongdiv","mscarries","mscarry","msgroup","mstack","msline","msrow","semantics","annotation","annotation-xml","mprescripts","none"]),js=W(["#text"]),Bs=W(["accept","action","align","alt","autocapitalize","autocomplete","autopictureinpicture","autoplay","background","bgcolor","border","capture","cellpadding","cellspacing","checked","cite","class","clear","color","cols","colspan","controls","controlslist","coords","crossorigin","datetime","decoding","default","dir","disabled","disablepictureinpicture","disableremoteplayback","download","draggable","enctype","enterkeyhint","exportparts","face","for","headers","height","hidden","high","href","hreflang","id","inert","inputmode","integrity","ismap","kind","label","lang","list","loading","loop","low","max","maxlength","media","method","min","minlength","multiple","muted","name","nonce","noshade","novalidate","nowrap","open","optimum","part","pattern","placeholder","playsinline","popover","popovertarget","popovertargetaction","poster","preload","pubdate","radiogroup","readonly","rel","required","rev","reversed","role","rows","rowspan","spellcheck","scope","selected","shape","size","sizes","slot","span","srclang","start","src","srcset","step","style","summary","tabindex","title","translate","type","usemap","valign","value","width","wrap","xmlns","slot"]),Bt=W(["accent-height","accumulate","additive","alignment-baseline","amplitude","ascent","attributename","attributetype","azimuth","basefrequency","baseline-shift","begin","bias","by","class","clip","clippathunits","clip-path","clip-rule","color","color-interpolation","color-interpolation-filters","color-profile","color-rendering","cx","cy","d","dx","dy","diffuseconstant","direction","display","divisor","dur","edgemode","elevation","end","exponent","fill","fill-opacity","fill-rule","filter","filterunits","flood-color","flood-opacity","font-family","font-size","font-size-adjust","font-stretch","font-style","font-variant","font-weight","fx","fy","g1","g2","glyph-name","glyphref","gradientunits","gradienttransform","height","href","id","image-rendering","in","in2","intercept","k","k1","k2","k3","k4","kerning","keypoints","keysplines","keytimes","lang","lengthadjust","letter-spacing","kernelmatrix","kernelunitlength","lighting-color","local","marker-end","marker-mid","marker-start","markerheight","markerunits","markerwidth","maskcontentunits","maskunits","max","mask","mask-type","media","method","mode","min","name","numoctaves","offset","operator","opacity","order","orient","orientation","origin","overflow","paint-order","path","pathlength","patterncontentunits","patterntransform","patternunits","points","preservealpha","preserveaspectratio","primitiveunits","r","rx","ry","radius","refx","refy","repeatcount","repeatdur","restart","result","rotate","scale","seed","shape-rendering","slope","specularconstant","specularexponent","spreadmethod","startoffset","stddeviation","stitchtiles","stop-color","stop-opacity","stroke-dasharray","stroke-dashoffset","stroke-linecap","stroke-linejoin","stroke-miterlimit","stroke-opacity","stroke","stroke-width","style","surfacescale","systemlanguage","tabindex","tablevalues","targetx","targety","transform","transform-origin","text-anchor","text-decoration","text-rendering","textlength","type","u1","u2","unicode","values","viewbox","visibility","version","vert-adv-y","vert-origin-x","vert-origin-y","width","word-spacing","wrap","writing-mode","xchannelselector","ychannelselector","x","x1","x2","xmlns","y","y1","y2","z","zoomandpan"]),Ds=W(["accent","accentunder","align","bevelled","close","columnsalign","columnlines","columnspan","denomalign","depth","dir","display","displaystyle","encoding","fence","frame","height","href","id","largeop","length","linethickness","lspace","lquote","mathbackground","mathcolor","mathsize","mathvariant","maxsize","minsize","movablelimits","notation","numalign","open","rowalign","rowlines","rowspacing","rowspan","rspace","rquote","scriptlevel","scriptminsize","scriptsizemultiplier","selection","separator","separators","stretchy","subscriptshift","supscriptshift","symmetric","voffset","width","xmlns"]),at=W(["xlink:href","xml:id","xlink:title","xml:space","xmlns:xlink"]),Yi=ee(/\{\{[\w\W]*|[\w\W]*\}\}/gm),Xi=ee(/<%[\w\W]*|[\w\W]*%>/gm),Vi=ee(/\$\{[\w\W]*/gm),Ji=ee(/^data-[\-\w.\u00B7-\uFFFF]+$/),Ki=ee(/^aria-[\-\w]+$/),Os=ee(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i),Zi=ee(/^(?:\w+script|data):/i),Qi=ee(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g),Fs=ee(/^html$/i),ea=ee(/^[a-z][.\w]*(-[.\w]+)+$/i),Ps=Object.freeze({__proto__:null,ARIA_ATTR:Ki,ATTR_WHITESPACE:Qi,CUSTOM_ELEMENT:ea,DATA_ATTR:Ji,DOCTYPE_NAME:Fs,ERB_EXPR:Xi,IS_ALLOWED_URI:Os,IS_SCRIPT_OR_DATA:Zi,MUSTACHE_EXPR:Yi,TMPLIT_EXPR:Vi}),Oe={element:1,attribute:2,text:3,cdataSection:4,entityReference:5,entityNode:6,progressingInstruction:7,comment:8,document:9,documentType:10,documentFragment:11,notation:12},ta=function(){return typeof window>"u"?null:window},sa=function(e,t){if(typeof e!="object"||typeof e.createPolicy!="function")return null;let s=null,i="data-tt-policy-suffix";t&&t.hasAttribute(i)&&(s=t.getAttribute(i));let a="dompurify"+(s?"#"+s:"");try{return e.createPolicy(a,{createHTML(n){return n},createScriptURL(n){return n}})}catch{return console.warn("TrustedTypes policy "+a+" could not be created."),null}},Rs=function(){return{afterSanitizeAttributes:[],afterSanitizeElements:[],afterSanitizeShadowDOM:[],beforeSanitizeAttributes:[],beforeSanitizeElements:[],beforeSanitizeShadowDOM:[],uponSanitizeAttribute:[],uponSanitizeElement:[],uponSanitizeShadowNode:[]}};function Gs(){let d=arguments.length>0&&arguments[0]!==void 0?arguments[0]:ta(),e=M=>Gs(M);if(e.version="3.3.1",e.removed=[],!d||!d.document||d.document.nodeType!==Oe.document||!d.Element)return e.isSupported=!1,e;let{document:t}=d,s=t,i=s.currentScript,{DocumentFragment:a,HTMLTemplateElement:n,Node:l,Element:o,NodeFilter:r,NamedNodeMap:c=d.NamedNodeMap||d.MozNamedAttrMap,HTMLFormElement:m,DOMParser:f,trustedTypes:b}=d,u=o.prototype,h=Ne(u,"cloneNode"),v=Ne(u,"remove"),y=Ne(u,"nextSibling"),w=Ne(u,"childNodes"),k=Ne(u,"parentNode");if(typeof n=="function"){let M=t.createElement("template");M.content&&M.content.ownerDocument&&(t=M.content.ownerDocument)}let S,L="",{implementation:ae,createNodeIterator:le,createDocumentFragment:V,getElementsByTagName:de}=t,{importNode:Z}=s,z=Rs();e.isSupported=typeof Ns=="function"&&typeof k=="function"&&ae&&ae.createHTMLDocument!==void 0;let{MUSTACHE_EXPR:g,ERB_EXPR:T,TMPLIT_EXPR:$,DATA_ATTR:F,ARIA_ATTR:Q,IS_SCRIPT_OR_DATA:fe,ATTR_WHITESPACE:Me,CUSTOM_ELEMENT:Ge}=Ps,{IS_ALLOWED_URI:Wt}=Ps,R=null,Yt=A({},[...Hs,...Ct,...Ht,...jt,...js]),N=null,Xt=A({},[...Bs,...Bt,...Ds,...at]),j=Object.seal(Dt(null,{tagNameCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},attributeNameCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},allowCustomizedBuiltInElements:{writable:!0,configurable:!1,enumerable:!0,value:!1}})),ze=null,rt=null,we=Object.seal(Dt(null,{tagCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},attributeCheck:{writable:!0,configurable:!1,enumerable:!0,value:null}})),Vt=!0,lt=!0,Jt=!1,Kt=!0,ke=!1,qe=!0,be=!1,dt=!1,ct=!1,Ee=!1,Ue=!1,We=!1,Zt=!0,Qt=!1,Us="user-content-",pt=!0,Ae=!1,Te={},ne=null,mt=A({},["annotation-xml","audio","colgroup","desc","foreignobject","head","iframe","math","mi","mn","mo","ms","mtext","noembed","noframes","noscript","plaintext","script","style","svg","template","thead","title","video","xmp"]),es=null,ts=A({},["audio","video","img","source","image","track"]),ut=null,ss=A({},["alt","class","for","id","label","name","pattern","placeholder","role","summary","title","value","style","xmlns"]),Ye="http://www.w3.org/1998/Math/MathML",Xe="http://www.w3.org/2000/svg",ce="http://www.w3.org/1999/xhtml",Se=ce,ht=!1,gt=null,Ws=A({},[Ye,Xe,ce],It),Ve=A({},["mi","mo","mn","ms","mtext"]),Je=A({},["annotation-xml"]),Ys=A({},["title","style","font","a","script"]),Ie=null,Xs=["application/xhtml+xml","text/html"],Vs="text/html",P=null,Le=null,Js=t.createElement("form"),is=function(p){return p instanceof RegExp||p instanceof Function},ft=function(){let p=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};if(!(Le&&Le===p)){if((!p||typeof p!="object")&&(p={}),p=re(p),Ie=Xs.indexOf(p.PARSER_MEDIA_TYPE)===-1?Vs:p.PARSER_MEDIA_TYPE,P=Ie==="application/xhtml+xml"?It:nt,R=ie(p,"ALLOWED_TAGS")?A({},p.ALLOWED_TAGS,P):Yt,N=ie(p,"ALLOWED_ATTR")?A({},p.ALLOWED_ATTR,P):Xt,gt=ie(p,"ALLOWED_NAMESPACES")?A({},p.ALLOWED_NAMESPACES,It):Ws,ut=ie(p,"ADD_URI_SAFE_ATTR")?A(re(ss),p.ADD_URI_SAFE_ATTR,P):ss,es=ie(p,"ADD_DATA_URI_TAGS")?A(re(ts),p.ADD_DATA_URI_TAGS,P):ts,ne=ie(p,"FORBID_CONTENTS")?A({},p.FORBID_CONTENTS,P):mt,ze=ie(p,"FORBID_TAGS")?A({},p.FORBID_TAGS,P):re({}),rt=ie(p,"FORBID_ATTR")?A({},p.FORBID_ATTR,P):re({}),Te=ie(p,"USE_PROFILES")?p.USE_PROFILES:!1,Vt=p.ALLOW_ARIA_ATTR!==!1,lt=p.ALLOW_DATA_ATTR!==!1,Jt=p.ALLOW_UNKNOWN_PROTOCOLS||!1,Kt=p.ALLOW_SELF_CLOSE_IN_ATTR!==!1,ke=p.SAFE_FOR_TEMPLATES||!1,qe=p.SAFE_FOR_XML!==!1,be=p.WHOLE_DOCUMENT||!1,Ee=p.RETURN_DOM||!1,Ue=p.RETURN_DOM_FRAGMENT||!1,We=p.RETURN_TRUSTED_TYPE||!1,ct=p.FORCE_BODY||!1,Zt=p.SANITIZE_DOM!==!1,Qt=p.SANITIZE_NAMED_PROPS||!1,pt=p.KEEP_CONTENT!==!1,Ae=p.IN_PLACE||!1,Wt=p.ALLOWED_URI_REGEXP||Os,Se=p.NAMESPACE||ce,Ve=p.MATHML_TEXT_INTEGRATION_POINTS||Ve,Je=p.HTML_INTEGRATION_POINTS||Je,j=p.CUSTOM_ELEMENT_HANDLING||{},p.CUSTOM_ELEMENT_HANDLING&&is(p.CUSTOM_ELEMENT_HANDLING.tagNameCheck)&&(j.tagNameCheck=p.CUSTOM_ELEMENT_HANDLING.tagNameCheck),p.CUSTOM_ELEMENT_HANDLING&&is(p.CUSTOM_ELEMENT_HANDLING.attributeNameCheck)&&(j.attributeNameCheck=p.CUSTOM_ELEMENT_HANDLING.attributeNameCheck),p.CUSTOM_ELEMENT_HANDLING&&typeof p.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements=="boolean"&&(j.allowCustomizedBuiltInElements=p.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements),ke&&(lt=!1),Ue&&(Ee=!0),Te&&(R=A({},js),N=[],Te.html===!0&&(A(R,Hs),A(N,Bs)),Te.svg===!0&&(A(R,Ct),A(N,Bt),A(N,at)),Te.svgFilters===!0&&(A(R,Ht),A(N,Bt),A(N,at)),Te.mathMl===!0&&(A(R,jt),A(N,Ds),A(N,at))),p.ADD_TAGS&&(typeof p.ADD_TAGS=="function"?we.tagCheck=p.ADD_TAGS:(R===Yt&&(R=re(R)),A(R,p.ADD_TAGS,P))),p.ADD_ATTR&&(typeof p.ADD_ATTR=="function"?we.attributeCheck=p.ADD_ATTR:(N===Xt&&(N=re(N)),A(N,p.ADD_ATTR,P))),p.ADD_URI_SAFE_ATTR&&A(ut,p.ADD_URI_SAFE_ATTR,P),p.FORBID_CONTENTS&&(ne===mt&&(ne=re(ne)),A(ne,p.FORBID_CONTENTS,P)),p.ADD_FORBID_CONTENTS&&(ne===mt&&(ne=re(ne)),A(ne,p.ADD_FORBID_CONTENTS,P)),pt&&(R["#text"]=!0),be&&A(R,["html","head","body"]),R.table&&(A(R,["tbody"]),delete ze.tbody),p.TRUSTED_TYPES_POLICY){if(typeof p.TRUSTED_TYPES_POLICY.createHTML!="function")throw Re('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');if(typeof p.TRUSTED_TYPES_POLICY.createScriptURL!="function")throw Re('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');S=p.TRUSTED_TYPES_POLICY,L=S.createHTML("")}else S===void 0&&(S=sa(b,i)),S!==null&&typeof L=="string"&&(L=S.createHTML(""));W&&W(p),Le=p}},as=A({},[...Ct,...Ht,...Ui]),ns=A({},[...jt,...Wi]),Ks=function(p){let x=k(p);(!x||!x.tagName)&&(x={namespaceURI:Se,tagName:"template"});let E=nt(p.tagName),H=nt(x.tagName);return gt[p.namespaceURI]?p.namespaceURI===Xe?x.namespaceURI===ce?E==="svg":x.namespaceURI===Ye?E==="svg"&&(H==="annotation-xml"||Ve[H]):!!as[E]:p.namespaceURI===Ye?x.namespaceURI===ce?E==="math":x.namespaceURI===Xe?E==="math"&&Je[H]:!!ns[E]:p.namespaceURI===ce?x.namespaceURI===Xe&&!Je[H]||x.namespaceURI===Ye&&!Ve[H]?!1:!ns[E]&&(Ys[E]||!as[E]):!!(Ie==="application/xhtml+xml"&&gt[p.namespaceURI]):!1},oe=function(p){De(e.removed,{element:p});try{k(p).removeChild(p)}catch{v(p)}},ve=function(p,x){try{De(e.removed,{attribute:x.getAttributeNode(p),from:x})}catch{De(e.removed,{attribute:null,from:x})}if(x.removeAttribute(p),p==="is")if(Ee||Ue)try{oe(x)}catch{}else try{x.setAttribute(p,"")}catch{}},os=function(p){let x=null,E=null;if(ct)p="<remove></remove>"+p;else{let B=_t(p,/^[\r\n\t ]+/);E=B&&B[0]}Ie==="application/xhtml+xml"&&Se===ce&&(p='<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>'+p+"</body></html>");let H=S?S.createHTML(p):p;if(Se===ce)try{x=new f().parseFromString(H,Ie)}catch{}if(!x||!x.documentElement){x=ae.createDocument(Se,"template",null);try{x.documentElement.innerHTML=ht?L:H}catch{}}let G=x.body||x.documentElement;return p&&E&&G.insertBefore(t.createTextNode(E),G.childNodes[0]||null),Se===ce?de.call(x,be?"html":"body")[0]:be?x.documentElement:G},rs=function(p){return le.call(p.ownerDocument||p,p,r.SHOW_ELEMENT|r.SHOW_COMMENT|r.SHOW_TEXT|r.SHOW_PROCESSING_INSTRUCTION|r.SHOW_CDATA_SECTION,null)},bt=function(p){return p instanceof m&&(typeof p.nodeName!="string"||typeof p.textContent!="string"||typeof p.removeChild!="function"||!(p.attributes instanceof c)||typeof p.removeAttribute!="function"||typeof p.setAttribute!="function"||typeof p.namespaceURI!="string"||typeof p.insertBefore!="function"||typeof p.hasChildNodes!="function")},ls=function(p){return typeof l=="function"&&p instanceof l};function pe(M,p,x){it(M,E=>{E.call(e,p,x,Le)})}let ds=function(p){let x=null;if(pe(z.beforeSanitizeElements,p,null),bt(p))return oe(p),!0;let E=P(p.nodeName);if(pe(z.uponSanitizeElement,p,{tagName:E,allowedTags:R}),qe&&p.hasChildNodes()&&!ls(p.firstElementChild)&&U(/<[/\w!]/g,p.innerHTML)&&U(/<[/\w!]/g,p.textContent)||p.nodeType===Oe.progressingInstruction||qe&&p.nodeType===Oe.comment&&U(/<[/\w]/g,p.data))return oe(p),!0;if(!(we.tagCheck instanceof Function&&we.tagCheck(E))&&(!R[E]||ze[E])){if(!ze[E]&&ps(E)&&(j.tagNameCheck instanceof RegExp&&U(j.tagNameCheck,E)||j.tagNameCheck instanceof Function&&j.tagNameCheck(E)))return!1;if(pt&&!ne[E]){let H=k(p)||p.parentNode,G=w(p)||p.childNodes;if(G&&H){let B=G.length;for(let J=B-1;J>=0;--J){let me=h(G[J],!0);me.__removalCount=(p.__removalCount||0)+1,H.insertBefore(me,y(p))}}}return oe(p),!0}return p instanceof o&&!Ks(p)||(E==="noscript"||E==="noembed"||E==="noframes")&&U(/<\/no(script|embed|frames)/i,p.innerHTML)?(oe(p),!0):(ke&&p.nodeType===Oe.text&&(x=p.textContent,it([g,T,$],H=>{x=Pe(x,H," ")}),p.textContent!==x&&(De(e.removed,{element:p.cloneNode()}),p.textContent=x)),pe(z.afterSanitizeElements,p,null),!1)},cs=function(p,x,E){if(Zt&&(x==="id"||x==="name")&&(E in t||E in Js))return!1;if(!(lt&&!rt[x]&&U(F,x))){if(!(Vt&&U(Q,x))){if(!(we.attributeCheck instanceof Function&&we.attributeCheck(x,p))){if(!N[x]||rt[x]){if(!(ps(p)&&(j.tagNameCheck instanceof RegExp&&U(j.tagNameCheck,p)||j.tagNameCheck instanceof Function&&j.tagNameCheck(p))&&(j.attributeNameCheck instanceof RegExp&&U(j.attributeNameCheck,x)||j.attributeNameCheck instanceof Function&&j.attributeNameCheck(x,p))||x==="is"&&j.allowCustomizedBuiltInElements&&(j.tagNameCheck instanceof RegExp&&U(j.tagNameCheck,E)||j.tagNameCheck instanceof Function&&j.tagNameCheck(E))))return!1}else if(!ut[x]){if(!U(Wt,Pe(E,Me,""))){if(!((x==="src"||x==="xlink:href"||x==="href")&&p!=="script"&&Oi(E,"data:")===0&&es[p])){if(!(Jt&&!U(fe,Pe(E,Me,"")))){if(E)return!1}}}}}}}return!0},ps=function(p){return p!=="annotation-xml"&&_t(p,Ge)},ms=function(p){pe(z.beforeSanitizeAttributes,p,null);let{attributes:x}=p;if(!x||bt(p))return;let E={attrName:"",attrValue:"",keepAttr:!0,allowedAttributes:N,forceKeepAttr:void 0},H=x.length;for(;H--;){let G=x[H],{name:B,namespaceURI:J,value:me}=G,$e=P(B),vt=me,O=B==="value"?vt:Fi(vt);if(E.attrName=$e,E.attrValue=O,E.keepAttr=!0,E.forceKeepAttr=void 0,pe(z.uponSanitizeAttribute,p,E),O=E.attrValue,Qt&&($e==="id"||$e==="name")&&(ve(B,p),O=Us+O),qe&&U(/((--!?|])>)|<\/(style|title|textarea)/i,O)){ve(B,p);continue}if($e==="attributename"&&_t(O,"href")){ve(B,p);continue}if(E.forceKeepAttr)continue;if(!E.keepAttr){ve(B,p);continue}if(!Kt&&U(/\/>/i,O)){ve(B,p);continue}ke&&it([g,T,$],hs=>{O=Pe(O,hs," ")});let us=P(p.nodeName);if(!cs(us,$e,O)){ve(B,p);continue}if(S&&typeof b=="object"&&typeof b.getAttributeType=="function"&&!J)switch(b.getAttributeType(us,$e)){case"TrustedHTML":{O=S.createHTML(O);break}case"TrustedScriptURL":{O=S.createScriptURL(O);break}}if(O!==vt)try{J?p.setAttributeNS(J,B,O):p.setAttribute(B,O),bt(p)?oe(p):Cs(e.removed)}catch{ve(B,p)}}pe(z.afterSanitizeAttributes,p,null)},Zs=function M(p){let x=null,E=rs(p);for(pe(z.beforeSanitizeShadowDOM,p,null);x=E.nextNode();)pe(z.uponSanitizeShadowNode,x,null),ds(x),ms(x),x.content instanceof a&&M(x.content);pe(z.afterSanitizeShadowDOM,p,null)};return e.sanitize=function(M){let p=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},x=null,E=null,H=null,G=null;if(ht=!M,ht&&(M="<!-->"),typeof M!="string"&&!ls(M))if(typeof M.toString=="function"){if(M=M.toString(),typeof M!="string")throw Re("dirty is not a string, aborting")}else throw Re("toString is not a function");if(!e.isSupported)return M;if(dt||ft(p),e.removed=[],typeof M=="string"&&(Ae=!1),Ae){if(M.nodeName){let me=P(M.nodeName);if(!R[me]||ze[me])throw Re("root node is forbidden and cannot be sanitized in-place")}}else if(M instanceof l)x=os("<!---->"),E=x.ownerDocument.importNode(M,!0),E.nodeType===Oe.element&&E.nodeName==="BODY"||E.nodeName==="HTML"?x=E:x.appendChild(E);else{if(!Ee&&!ke&&!be&&M.indexOf("<")===-1)return S&&We?S.createHTML(M):M;if(x=os(M),!x)return Ee?null:We?L:""}x&&ct&&oe(x.firstChild);let B=rs(Ae?M:x);for(;H=B.nextNode();)ds(H),ms(H),H.content instanceof a&&Zs(H.content);if(Ae)return M;if(Ee){if(Ue)for(G=V.call(x.ownerDocument);x.firstChild;)G.appendChild(x.firstChild);else G=x;return(N.shadowroot||N.shadowrootmode)&&(G=Z.call(s,G,!0)),G}let J=be?x.outerHTML:x.innerHTML;return be&&R["!doctype"]&&x.ownerDocument&&x.ownerDocument.doctype&&x.ownerDocument.doctype.name&&U(Fs,x.ownerDocument.doctype.name)&&(J="<!DOCTYPE "+x.ownerDocument.doctype.name+`>
`+J),ke&&it([g,T,$],me=>{J=Pe(J,me," ")}),S&&We?S.createHTML(J):J},e.setConfig=function(){let M=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};ft(M),dt=!0},e.clearConfig=function(){Le=null,dt=!1},e.isValidAttribute=function(M,p,x){Le||ft({});let E=P(M),H=P(p);return cs(E,H,x)},e.addHook=function(M,p){typeof p=="function"&&De(z[M],p)},e.removeHook=function(M,p){if(p!==void 0){let x=Ri(z[M],p);return x===-1?void 0:Ni(z[M],x,1)[0]}return Cs(z[M])},e.removeHooks=function(M){z[M]=[]},e.removeAllHooks=function(){z=Rs()},e}var qs=Gs();var Nt="aias_session_token",Ot=class{base="https://api.aiassist.net";async init(){try{let t=await(await fetch("/api/config")).json();t.aias_api_base&&(this.base=String(t.aias_api_base).replace(/\/$/,""))}catch{}}get token(){return localStorage.getItem(Nt)}set token(e){e?localStorage.setItem(Nt,e):localStorage.removeItem(Nt)}get connected(){return!!this.token}async api(e,t={}){let s={"Content-Type":"application/json",...t.headers||{}};return this.token&&(s["X-Session-Token"]=this.token),fetch(`${this.base}${e}`,{...t,headers:s})}async json(e,t={}){let s=await this.api(e,t),i=null;try{i=await s.json()}catch{}return{ok:s.ok,status:s.status,data:i}}async login(e,t){let{ok:s,data:i}=await this.json("/api/auth/login",{method:"POST",body:JSON.stringify({email:e,password:t})});return i?.requires_2fa&&i?.pending_token?{twofa:!0,pending:i.pending_token}:s&&i?.session_token?(this.token=i.session_token,{ok:!0}):{error:i?.detail||i?.error||"Sign-in failed."}}async verify2fa(e,t){let{ok:s,data:i}=await this.json("/api/auth/verify-2fa",{method:"POST",body:JSON.stringify({pending_token:e,code:t})});return s&&i?.session_token?(this.token=i.session_token,{ok:!0}):{error:i?.detail||i?.error||"Invalid code."}}disconnect(){this.token=null}},X=new Ot;function K(d){return String(d??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}function ia(d){if(!d)return"";let e=(Date.now()-new Date(d).getTime())/1e3;return e<60?"now":e<3600?`${Math.floor(e/60)}m`:e<86400?`${Math.floor(e/3600)}h`:`${Math.floor(e/86400)}d`}function Ft(d,e){d.innerHTML=`
    <div class="flex items-center justify-center h-full px-4">
      <div class="max-w-sm w-full bg-zinc-900/70 border border-zinc-800 rounded-xl p-6 slide-up">
        <div class="text-center mb-4">
          <div class="text-2xl mb-1">\u{1F517}</div>
          <h2 class="text-lg font-bold">Connect AiAssist</h2>
          <p class="text-zinc-400 text-sm mt-1">Inline AiAS tools run on your v1 account. One-time connect \u2014 the session is stored on this device.</p>
        </div>
        <form id="aias-connect-form" class="space-y-3">
          <input type="email" name="email" class="input" placeholder="you@company.com" required autocomplete="email" />
          <input type="password" name="password" class="input" placeholder="AiAssist password" required autocomplete="current-password" />
          <div id="aias-2fa-row" class="hidden">
            <input type="text" name="code" class="input font-mono text-center tracking-widest" placeholder="000000" maxlength="6" pattern="[0-9]{6}" inputmode="numeric" autocomplete="one-time-code" />
          </div>
          <p id="aias-connect-err" class="hidden text-sm text-red-400"></p>
          <button type="submit" class="btn btn-gradient w-full py-2.5">Connect</button>
        </form>
      </div>
    </div>`;let t=null,s=i=>{let a=document.getElementById("aias-connect-err");a.textContent=i,a.classList.remove("hidden")};document.getElementById("aias-connect-form").addEventListener("submit",async i=>{i.preventDefault();let a=new FormData(i.target);if(t){let l=await X.verify2fa(t,String(a.get("code")||""));return l.ok?e():s(l.error||"Invalid code.")}let n=await X.login(String(a.get("email")||""),String(a.get("password")||""));if(n.ok)return e();if(n.twofa&&n.pending){t=n.pending,document.getElementById("aias-2fa-row").classList.remove("hidden"),s("Enter the 6-digit code from your authenticator.");return}s(n.error||"Sign-in failed.")})}var aa={keystone:{title:"KeyStone",blurb:"Build & ship full apps in the KeyStone IDE. Docked from v1 \u2014 native weave is next on the roadmap.",path:"/keystone",icon:"\u{1F48E}"},artifacts:{title:"Artifacts",blurb:"The agent artifact generator \u2014 already translated to the Portal client, docked here from v1.",path:"/dashboard/artifact-portal",icon:"\u2728"},image:{title:"Image Studio",blurb:"Generate and edit imagery with your BYOK providers.",path:"/dashboard/image-workstation",icon:"\u{1F5BC}\uFE0F"},agents:{title:"Agents",blurb:"Your deployed v1 agents. Phase 2 registers them as first-class DevNet citizens through the bot platform.",path:"/dashboard/deployed-agents",icon:"\u{1F916}"}};function na(d,e,t){let s=aa[e];d.innerHTML=`
    <div class="flex items-center justify-center h-full px-4">
      <div class="max-w-md w-full bg-zinc-900/70 border border-zinc-800 rounded-xl p-6 text-center slide-up">
        <div class="text-3xl mb-2">${s.icon}</div>
        <h2 class="text-xl font-bold mb-1">${K(s.title)}</h2>
        <p class="text-zinc-400 text-sm mb-4">${K(s.blurb)}</p>
        <a href="${t}${s.path}" target="_blank" rel="noopener noreferrer" class="btn btn-gradient w-full py-2.5 inline-block">Open ${K(s.title)} \u2197</a>
        <p class="text-[11px] text-zinc-500 mt-3">Runs on your connected AiAssist account</p>
      </div>
    </div>`}function oa(d,e){let t=`${e}/keystone#st=${encodeURIComponent(X.token||"")}`;d.innerHTML=`
    <div class="flex flex-col h-full min-h-0">
      <div class="flex items-center gap-3 px-4 py-2 border-b border-zinc-800 bg-zinc-900/60">
        <span class="text-sm font-bold flex items-center gap-2">\u{1F48E} KeyStone</span>
        <span class="text-[11px] text-zinc-500 hidden sm:inline">v1 IDE, woven inline \u2014 blank canvas below means framing isn't enabled on the AiAS server yet</span>
        <span class="flex-1"></span>
        <a href="${t}" target="_blank" rel="noopener noreferrer"
           class="text-xs px-3 py-1.5 rounded-md bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 hover:bg-emerald-600/30">
          Open full-screen \u2197
        </a>
      </div>
      <iframe src="${t}" class="flex-1 w-full border-0 bg-zinc-950"
              allow="clipboard-read; clipboard-write"
              referrerpolicy="strict-origin"></iframe>
    </div>`}var Gt=class{constructor(e){this.root=e}sessions=[];current=null;providers=[];streaming=!1;async mount(){this.root.innerHTML='<div class="flex items-center justify-center h-full text-zinc-500 text-sm">Loading Playground\u2026</div>';let[e,t]=await Promise.all([X.json("/api/playground/sessions"),X.json("/api/providers")]);if(e.status===401){X.disconnect(),Ft(this.root,()=>this.mount());return}this.sessions=Array.isArray(e.data)?e.data:[];let s=t.data?.providers??t.data;this.providers=Array.isArray(s)?s:[],this.render(),this.sessions.length&&this.select(this.sessions[0].id)}render(){this.root.innerHTML=`
      <div class="flex h-full min-h-0">
        <div class="w-60 shrink-0 border-r border-zinc-800 flex flex-col min-h-0">
          <div class="p-3 flex items-center justify-between border-b border-zinc-800">
            <span class="text-sm font-bold">Playground</span>
            <button id="pg-new" class="text-xs px-2 py-1 rounded-md bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 hover:bg-emerald-600/30">+ New</button>
          </div>
          <div id="pg-sessions" class="flex-1 overflow-y-auto p-2 space-y-1"></div>
          <div class="p-2 border-t border-zinc-800">
            <button id="pg-disconnect" class="text-[11px] text-zinc-500 hover:text-zinc-300">Disconnect AiAssist</button>
          </div>
        </div>
        <div class="flex-1 flex flex-col min-h-0">
          <div id="pg-toolbar" class="px-4 py-2.5 border-b border-zinc-800 flex items-center gap-2 flex-wrap"></div>
          <div id="pg-messages" class="flex-1 overflow-y-auto px-4 py-4 space-y-3"></div>
          <div class="p-3 border-t border-zinc-800">
            <form id="pg-form" class="flex gap-2">
              <textarea id="pg-input" class="input flex-1 resize-none" rows="1" placeholder="Message the model\u2026 (Enter to send, Shift+Enter for newline)"></textarea>
              <button id="pg-send" class="btn btn-gradient px-4" type="submit">Send</button>
            </form>
            <p id="pg-status" class="text-[11px] text-zinc-500 mt-1.5 h-4"></p>
          </div>
        </div>
      </div>`,document.getElementById("pg-new").addEventListener("click",()=>this.create()),document.getElementById("pg-disconnect").addEventListener("click",()=>{X.disconnect(),Ft(this.root,()=>this.mount())}),document.getElementById("pg-form").addEventListener("submit",s=>{s.preventDefault(),this.send()}),document.getElementById("pg-input").addEventListener("keydown",s=>{s.key==="Enter"&&!s.shiftKey&&(s.preventDefault(),this.send())}),this.renderSessions(),this.renderToolbar(),this.renderMessages()}renderSessions(){let e=document.getElementById("pg-sessions");if(e){if(!this.sessions.length){e.innerHTML='<p class="text-xs text-zinc-500 px-2 py-4 text-center">No sessions yet \u2014 start one.</p>';return}e.innerHTML=this.sessions.map(t=>`
      <div class="group flex items-center gap-1 rounded-lg ${this.current?.id===t.id?"bg-zinc-800":"hover:bg-zinc-800/60"}">
        <button data-pg-sel="${K(t.id)}" class="flex-1 text-left px-2.5 py-2 min-w-0">
          <span class="block text-[13px] font-medium truncate">${K(t.name||"Untitled")}</span>
          <span class="block text-[11px] text-zinc-500 truncate">${K(t.model_name||"auto")} \xB7 ${ia(t.updated_at)}</span>
        </button>
        <button data-pg-del="${K(t.id)}" class="hidden group-hover:block px-1.5 text-zinc-500 hover:text-red-400" title="Delete">\u2715</button>
      </div>`).join(""),e.querySelectorAll("[data-pg-sel]").forEach(t=>t.addEventListener("click",()=>this.select(t.dataset.pgSel))),e.querySelectorAll("[data-pg-del]").forEach(t=>t.addEventListener("click",()=>this.remove(t.dataset.pgDel)))}}renderToolbar(){let e=document.getElementById("pg-toolbar");if(!e)return;if(!this.current){e.innerHTML='<span class="text-sm text-zinc-500">Select or create a session</span>';return}let t=this.providers.map(a=>`<option value="${K(a.id)}" ${a.id===this.current.model_provider?"selected":""}>${K(a.name||a.id)}</option>`).join(""),i=(this.providers.find(a=>a.id===this.current.model_provider)?.models||[]).map(a=>`<option value="${K(a.id)}" ${a.id===this.current.model_name?"selected":""}>${K(a.name||a.id)}</option>`).join("");e.innerHTML=`
      <span class="text-sm font-semibold truncate max-w-[200px]">${K(this.current.name||"Untitled")}</span>
      <span class="flex-1"></span>
      <select id="pg-provider" class="input !w-auto !py-1 text-xs">${t||'<option value="">default</option>'}</select>
      <select id="pg-model" class="input !w-auto !py-1 text-xs">${i||'<option value="">auto</option>'}</select>`,document.getElementById("pg-provider")?.addEventListener("change",a=>{this.patch({model_provider:a.target.value})}),document.getElementById("pg-model")?.addEventListener("change",a=>{this.patch({model_name:a.target.value})})}renderMessages(){let e=document.getElementById("pg-messages");if(!e)return;let t=this.current?.messages||[];if(!this.current){e.innerHTML="";return}if(!t.length){e.innerHTML='<div class="text-center text-zinc-500 text-sm py-16">Fresh session \u2014 say something.</div>';return}e.innerHTML=t.map(s=>`
      <div class="flex ${s.role==="user"?"justify-end":"justify-start"}">
        <div class="max-w-[82%] rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words ${s.role==="user"?"bg-emerald-600/25 border border-emerald-600/30":"bg-zinc-800/80 border border-zinc-700/50"}">${K(s.content)}</div>
      </div>`).join(""),e.scrollTop=e.scrollHeight}status(e){let t=document.getElementById("pg-status");t&&(t.textContent=e)}async create(){let{ok:e,data:t}=await X.json("/api/playground/sessions",{method:"POST",body:JSON.stringify({name:`DevNet session ${new Date().toLocaleTimeString()}`})});if(!e){this.status("Could not create session.");return}this.sessions.unshift(t),this.render(),this.select(t.id)}async remove(e){await X.json(`/api/playground/sessions/${e}`,{method:"DELETE"}),this.sessions=this.sessions.filter(t=>t.id!==e),this.current?.id===e&&(this.current=null),this.renderSessions(),this.renderToolbar(),this.renderMessages()}async select(e){let{ok:t,data:s}=await X.json(`/api/playground/sessions/${e}`);t&&(this.current=s,this.renderSessions(),this.renderToolbar(),this.renderMessages())}async patch(e){if(!this.current)return;let{ok:t,data:s}=await X.json(`/api/playground/sessions/${this.current.id}`,{method:"PATCH",body:JSON.stringify(e)});t&&(this.current={...this.current,...s},this.renderToolbar())}async send(){if(this.streaming||!this.current)return;let e=document.getElementById("pg-input"),t=e.value.trim();if(!t)return;e.value="",this.streaming=!0,document.getElementById("pg-send").disabled=!0,this.current.messages=this.current.messages||[],this.current.messages.push({id:"u",role:"user",content:t});let s={id:"a",role:"assistant",content:""};this.current.messages.push(s),this.renderMessages(),this.status("Streaming\u2026");try{let i=await X.api(`/api/playground/sessions/${this.current.id}/chat/stream`,{method:"POST",body:JSON.stringify({message:t})});if(!i.ok||!i.body){let o=await i.json().catch(()=>({}));s.content=`\u26A0\uFE0F ${o?.detail||`Request failed (${i.status})`}`,this.renderMessages();return}let a=i.body.getReader(),n=new TextDecoder,l="";for(;;){let{done:o,value:r}=await a.read();if(o)break;l+=n.decode(r,{stream:!0});let c=l.split(`

`);l=c.pop()||"";for(let m of c){let f=m.split(`
`).find(b=>b.startsWith("data: "));if(f)try{let b=JSON.parse(f.slice(6));b.type==="chunk"&&b.content?(s.content+=b.content,this.renderMessages()):b.type==="tool_start"?this.status(`Running ${b.count} tool${b.count===1?"":"s"}\u2026`):b.type==="tool_exec"?this.status(`Tool: ${b.tool_name}\u2026`):b.type==="tool_done"?this.status("Streaming\u2026"):b.type==="error"&&(s.content+=`
\u26A0\uFE0F ${b.message||"stream error"}`,this.renderMessages())}catch{}}}await this.select(this.current.id)}catch{s.content+=`
\u26A0\uFE0F Network error.`,this.renderMessages()}finally{this.streaming=!1,document.getElementById("pg-send").disabled=!1,this.status("")}}};async function qt(d,e){await X.init();let t=X.base.replace("api.","").replace(/\/$/,"");if(!X.connected){Ft(d,()=>{qt(d,e)});return}if(e==="playground"){await new Gt(d).mount();return}if(e==="keystone"){oa(d,t);return}na(d,e,t)}_.setOptions({breaks:!0,gfm:!0});function ge(d){let e=[],t=d.replace(/```[\s\S]*?```/g,a=>(e.push(a),`%%CODEBLOCK_${e.length-1}%%`)),s=[];t=t.replace(/`[^`]+`/g,a=>(s.push(a),`%%INLINECODE_${s.length-1}%%`)),t=t.replace(/@([a-zA-Z0-9_]+)/g,'<a href="#" class="mention" data-mention="$1">@$1</a>').replace(/#([a-zA-Z0-9_]+)/g,'<a href="#" class="hashtag" data-tag="$1">#$1</a>'),s.forEach((a,n)=>{t=t.replace(`%%INLINECODE_${n}%%`,a)}),e.forEach((a,n)=>{t=t.replace(`%%CODEBLOCK_${n}%%`,a)});let i=_.parse(t);return qs.sanitize(i,{ADD_ATTR:["data-mention","data-tag"],ADD_TAGS:["img"],ADD_URI_SAFE_ATTR:["src"]})}function C(d,e="success"){let t=document.createElement("div"),i={success:{bg:"rgba(16,185,129,0.15)",border:"#10b981",text:"#34d399",icon:"M5 13l4 4L19 7"},error:{bg:"rgba(16,185,129,0.15)",border:"#059669",text:"#f87171",icon:"M6 18L18 6M6 6l12 12"},info:{bg:"rgba(59,130,246,0.15)",border:"#3b82f6",text:"#60a5fa",icon:"M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"}}[e];t.style.cssText=`
    position: fixed; top: 20px; right: 20px; z-index: 99999;
    background: ${i.bg}; backdrop-filter: blur(20px);
    border: 1px solid ${i.border}; border-radius: 12px;
    padding: 12px 20px; display: flex; align-items: center; gap: 10px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4); max-width: 400px;
    animation: toastSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    font-family: system-ui, -apple-system, sans-serif;
  `,t.innerHTML=`
    <style>
      @keyframes toastSlideIn { from { opacity: 0; transform: translateX(100px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes toastSlideOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(100px); } }
    </style>
    <svg width="18" height="18" fill="none" stroke="${i.text}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="${i.icon}"/></svg>
    <span style="color: ${i.text}; font-size: 13px; font-weight: 600;">${d}</span>
  `,document.body.appendChild(t),setTimeout(()=>{t.style.animation="toastSlideOut 0.3s ease-in forwards",setTimeout(()=>t.remove(),300)},3e3)}function D(d,e="info",t){let s=document.getElementById("epic-modal-overlay");s&&s.remove();let a={error:{bg:"#059669",glow:"rgba(16,185,129,0.5)",icon:"M6 18L18 6M6 6l12 12"},success:{bg:"#10b981",glow:"rgba(16,185,129,0.5)",icon:"M5 13l4 4L19 7"},warning:{bg:"#f59e0b",glow:"rgba(245,158,11,0.5)",icon:"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"},info:{bg:"#3b82f6",glow:"rgba(59,130,246,0.5)",icon:"M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"}}[e],n=t||(e==="error"?"Error":e==="success"?"Success":e==="warning"?"Warning":"Notice"),l=document.createElement("div");l.id="epic-modal-overlay",l.style.cssText=`
    position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center; z-index: 9999;
    animation: epicFadeIn 0.3s ease-out;
  `,l.innerHTML=`
    <style>
      @keyframes epicFadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes epicSlideUp { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes epicPulse { 0%, 100% { box-shadow: 0 0 20px ${a.glow}; } 50% { box-shadow: 0 0 40px ${a.glow}, 0 0 60px ${a.glow}; } }
      @keyframes epicIconPop { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
    </style>
    <div style="
      background: linear-gradient(145deg, #1f1f23, #18181b);
      border: 1px solid #3f3f46;
      border-radius: 24px;
      padding: 32px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      animation: epicSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5), 0 0 30px ${a.glow};
    ">
      <div style="
        width: 72px; height: 72px; border-radius: 50%; margin: 0 auto 20px;
        background: linear-gradient(135deg, ${a.bg}, ${a.bg}cc);
        display: flex; align-items: center; justify-content: center;
        animation: epicIconPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both, epicPulse 2s ease-in-out infinite;
        box-shadow: 0 8px 32px ${a.glow};
      ">
        <svg width="36" height="36" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
          <path d="${a.icon}"/>
        </svg>
      </div>
      <h3 style="color: #fafafa; font-size: 22px; font-weight: 700; margin: 0 0 12px; letter-spacing: -0.5px;">${n}</h3>
      <p style="color: #a1a1aa; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">${d}</p>
      <button id="epic-modal-close" style="
        background: linear-gradient(135deg, ${a.bg}, ${a.bg}dd);
        color: white; border: none; padding: 14px 48px; border-radius: 12px;
        font-size: 15px; font-weight: 600; cursor: pointer;
        transition: all 0.2s ease; box-shadow: 0 4px 20px ${a.glow};
      " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 30px ${a.glow}';"
         onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 20px ${a.glow}';">
        Got it
      </button>
    </div>
  `,document.body.appendChild(l);let o=document.getElementById("epic-modal-close"),r=()=>{l.style.animation="epicFadeIn 0.2s ease-out reverse",setTimeout(()=>l.remove(),200)};o?.addEventListener("click",r),l.addEventListener("click",c=>{c.target===l&&r()}),document.addEventListener("keydown",function c(m){m.key==="Escape"&&(r(),document.removeEventListener("keydown",c))})}var he="devnetwork_hash",Fe="devnetwork_device_token",ot=[{id:"field",question:"What best describes you?",options:[{label:"Founder / CEO",value:"founder"},{label:"Developer / Engineer",value:"developer"},{label:"Designer / Creative",value:"designer"},{label:"Marketer / Growth",value:"marketer"},{label:"Product Manager",value:"product"},{label:"Freelancer / Agency",value:"freelancer"}]},{id:"experience",question:"Where are you on your journey?",options:[{label:"Just getting started \u2014 exploring ideas",value:"exploring"},{label:"Building my first product",value:"building"},{label:"Shipped something, finding PMF",value:"shipped"},{label:"Scaling \u2014 revenue or team growing",value:"scaling"}]},{id:"skills",question:"What's in your toolkit? (pick all that apply)",multiSelect:!0,options:[{label:"Full-Stack Development",value:"fullstack"},{label:"Frontend / UI",value:"frontend"},{label:"Backend / APIs",value:"backend"},{label:"Mobile Apps",value:"mobile"},{label:"AI / Machine Learning",value:"ai"},{label:"UI/UX Design",value:"design"},{label:"No-Code / Low-Code",value:"nocode"},{label:"Growth & Marketing",value:"growth"},{label:"Sales & Biz Dev",value:"sales"},{label:"Content & Copywriting",value:"content"},{label:"DevOps / Cloud",value:"devops"},{label:"Data & Analytics",value:"data"}]},{id:"focus",question:"What are you here for?",options:[{label:"Find a co-founder or teammates",value:"cofounder"},{label:"Get feedback on what I'm building",value:"feedback"},{label:"Connect with other builders",value:"network"},{label:"Find clients or freelance gigs",value:"clients"}]},{id:"interests",question:"What fires you up? (pick all that apply)",multiSelect:!0,options:[{label:"SaaS & Micro-SaaS",value:"saas"},{label:"Indie Hacking",value:"indiehacking"},{label:"AI Products & Tools",value:"ai-products"},{label:"Developer Tools",value:"devtools"},{label:"E-Commerce / DTC",value:"ecommerce"},{label:"Content Creation",value:"content"},{label:"Open Source",value:"opensource"},{label:"Web3 / Crypto",value:"web3"},{label:"Building in Public",value:"buildinpublic"},{label:"Revenue & Monetization",value:"revenue"},{label:"Fundraising & VCs",value:"fundraising"},{label:"Remote & Async Work",value:"remote"}]},{id:"teamSize",question:"How do you like to build?",options:[{label:"Solo \u2014 I do everything myself",value:"solo"},{label:"Small crew (2-4 people)",value:"small"},{label:"Growing team (5-15)",value:"medium"},{label:"I'm flexible",value:"any"}]}],ra=[{question:"You have a startup idea at 2am. First thing you do?",options:["Open VS Code and start building a prototype \u{1F4BB}","Write down the value prop and target market \u{1F4DD}","Search if someone already built it \u{1F50D}"],hint:"This reveals how you think...",forFields:["software","design","marketing","data","product","devops"]},{question:"Your MVP is ready but the code is messy. You...",options:["Ship it now, refactor later \u2014 users first \u{1F680}","Clean the codebase before anyone sees it \u{1F9F9}","Get 5 users to test it while I fix things in parallel \u26A1"],hint:"Speed vs. craft...",forFields:["software","design","marketing","data","product","devops"]},{question:"A co-founder disagrees on the product direction. You...",options:["Show them the data and let numbers decide \u{1F4CA}","Prototype both ideas and A/B test with users \u{1F9EA}","Have a deep conversation about the vision and align \u{1F91D}"],hint:"How you resolve conflict matters...",forFields:["software","design","marketing","data","product","devops"]},{question:"You just got your first 100 users. Next move?",options:["Talk to every single user to understand their pain \u{1F3AF}","Build the features they're asking for ASAP \u{1F3D7}\uFE0F","Write a launch thread and start building in public \u{1F4E3}"],hint:"Growth mode activated...",forFields:["software","design","marketing","data","product","devops"]},{question:"What's your unfair advantage as a builder?",options:["I can ship a full product solo \u2014 design to deploy \u{1F6E0}\uFE0F","I understand users better than most engineers do \u{1F9E0}","I can get people excited about anything I'm building \u{1F525}"],hint:"Everyone's got one...",forFields:["software","design","marketing","data","product","devops"]}];var Ut=class{appState;wizardState=null;container;selectedSkills=[];feedSocket=null;posts=[];_notifDebounce=null;_currentView="";activeEcosystem=null;userEcosystems=[];defaultEcosystemId="";constructor(){this.appState={mode:"loading",user:null,hash:null},this.container=document.getElementById("wizard-container")||document.getElementById("main-content"),this.init()}setContent(e,t){t&&(this._currentView=t),this.container.scrollTop=0,this.container.innerHTML=e}async init(){try{let t=await fetch("/api/config");if(t.ok){let s=await t.json();this.defaultEcosystemId=s.default_ecosystem_id||""}}catch{}let e=localStorage.getItem(he);if(e){let t=await this.validateHash(e);if(t.requires_2fa){this.showLogin2FA(e);return}if(t.user){this.appState={mode:"app",user:t.user,hash:e},this.showApp();return}localStorage.removeItem(he)}this.appState.mode="wizard",this.showAuthLanding("login")}async validateHash(e,t){try{let s=localStorage.getItem(Fe),i=await fetch("/api/auth/validate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({hash:e,totp_code:t,device_token:s})});if(i.ok){let a=await i.json();return a.requires_2fa?{user:null,requires_2fa:!0}:{user:a.user}}}catch(s){console.error("Auth validation failed:",s)}return{user:null}}showLogin2FA(e){this.container.innerHTML=`
      <div class="max-w-md mx-auto px-3 sm:px-4 py-6 sm:py-12" style="height:100dvh;height:100vh;overflow-y:auto;-webkit-overflow-scrolling:touch;">
        <div class="card slide-up">
          <div class="text-center mb-4 sm:mb-6">
            <div class="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 mb-3 shadow-lg shadow-emerald-500/25">
              <svg class="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
            <h2 class="text-xl sm:text-2xl font-bold gradient-text">Welcome Back</h2>
            <p class="text-zinc-400 mt-1 text-sm">Enter your 2FA code to continue</p>
          </div>
          
          <form id="login-2fa-form" class="space-y-3 sm:space-y-4">
            <div>
              <label class="block text-sm font-medium text-zinc-400 mb-2">6-digit code from your authenticator app</label>
              <input type="text" id="login-totp-code" name="code" 
                class="input text-center text-xl sm:text-2xl tracking-[0.4em] sm:tracking-[0.5em] font-mono" 
                placeholder="000000" maxlength="6" pattern="[0-9]{6}" 
                autocomplete="one-time-code" inputmode="numeric" required>
            </div>
            <p id="login-2fa-error" class="text-sm text-red-400 hidden"></p>
            <button type="submit" class="btn btn-primary w-full py-2.5 sm:py-3">
              Sign In
            </button>
          </form>
          
          <div class="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-zinc-700/50 text-center">
            <button id="use-different-device" class="text-sm text-zinc-500 hover:text-zinc-300">
              Use a different account
            </button>
          </div>
        </div>
        <div style="height:2rem;"></div>
      </div>
    `;let t=document.getElementById("login-2fa-form"),s=document.getElementById("login-totp-code");s.addEventListener("input",i=>{let a=i.target;a.value=a.value.replace(/\D/g,"").slice(0,6)}),t.addEventListener("submit",async i=>{i.preventDefault();let a=s.value,n=document.getElementById("login-2fa-error"),l=t.querySelector('button[type="submit"]');if(a.length!==6){n.textContent="Please enter a 6-digit code",n.classList.remove("hidden");return}l.disabled=!0,l.innerHTML='<svg class="w-5 h-5 animate-spin mx-auto" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>',n.classList.add("hidden");try{let o=await fetch("/api/auth/verify-login-2fa",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({hash:e,code:a})}),r=await o.json();if(o.ok&&r.success)r.device_token&&localStorage.setItem(Fe,r.device_token),this.appState={mode:"app",user:r.user,hash:e},this.showApp();else throw new Error(r.error||"Invalid code")}catch(o){n.textContent=o.message||"Invalid code. Please try again.",n.classList.remove("hidden"),l.disabled=!1,l.innerHTML='<svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg> Sign In',s.value="",s.focus()}}),document.getElementById("use-different-device")?.addEventListener("click",()=>{localStorage.removeItem(he),localStorage.removeItem(Fe),this.appState.mode="wizard",this.showAuthLanding("login")}),s.focus()}generateSessionId(){return"session_"+Math.random().toString(36).substring(2,15)+Date.now().toString(36)}async getFingerprint(){let e=document.createElement("canvas"),t=e.getContext("2d");t.textBaseline="top",t.font="14px Arial",t.fillText("DevNetwork fingerprint",2,2);let s=e.toDataURL(),i=`${screen.width}x${screen.height}x${screen.colorDepth}`,a=Intl.DateTimeFormat().resolvedOptions().timeZone,n=navigator.language,l=navigator.platform,o=`${s}|${i}|${a}|${n}|${l}`,c=new TextEncoder().encode(o),m=await crypto.subtle.digest("SHA-256",c);return Array.from(new Uint8Array(m)).map(b=>b.toString(16).padStart(2,"0")).join("")}delay(e){return new Promise(t=>setTimeout(t,e))}showAuthLanding(e="login"){let t=e==="login";this.container.innerHTML=`
      <div class="relative flex items-center justify-center px-3 sm:px-4" style="height:100dvh;height:100vh;overflow-y:auto;-webkit-overflow-scrolling:touch;">
        <video autoplay muted loop playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;"></video>
        <div class="absolute inset-0 bg-zinc-950/80" style="z-index:1;"></div>

        <div class="max-w-md w-full relative py-4 sm:py-6" style="z-index:3;">
          <div class="slide-up relative overflow-hidden backdrop-blur-md bg-zinc-900/70 border border-zinc-700/50 rounded-xl p-5 sm:p-7">
            <div class="text-center mb-5">
              <div class="relative inline-flex items-center justify-center mb-3">
                <div class="absolute bg-emerald-500 rounded-2xl blur-xl opacity-25 animate-pulse" style="width:72px;height:72px;"></div>
                <img src="/static/logo-icon-dark.png" alt="AiAS" class="relative" style="height:56px;object-fit:contain;filter:drop-shadow(0 0 18px rgba(16,185,129,0.35));">
              </div>
              <h1 class="text-2xl sm:text-3xl font-bold mb-1"><span class="gradient-text glow-text">AiAS</span></h1>
              <p class="text-zinc-400 text-sm">Your team \u2014 human and AI \u2014 in one space.</p>
            </div>

            <div class="grid grid-cols-2 gap-1 mb-5 p-1 rounded-lg bg-zinc-800/60 border border-zinc-700/40">
              <button id="auth-tab-login" class="py-2 rounded-md text-sm font-semibold transition-colors ${t?"bg-zinc-700 text-white":"text-zinc-400 hover:text-zinc-200"}">Sign in</button>
              <button id="auth-tab-signup" class="py-2 rounded-md text-sm font-semibold transition-colors ${t?"text-zinc-400 hover:text-zinc-200":"bg-zinc-700 text-white"}">Create account</button>
            </div>

            <form id="auth-form" class="space-y-3 text-left">
              ${t?"":`
              <div>
                <label class="block text-xs font-medium text-zinc-400 mb-1">Display name</label>
                <input type="text" name="display_name" class="input" placeholder="How should the team know you?" required minlength="2" maxlength="32" autocomplete="nickname" />
              </div>`}
              <div>
                <label class="block text-xs font-medium text-zinc-400 mb-1">Email</label>
                <input type="email" name="email" class="input" placeholder="you@company.com" required autocomplete="email" />
              </div>
              <div>
                <label class="block text-xs font-medium text-zinc-400 mb-1">Password</label>
                <input type="password" name="password" class="input" placeholder="${t?"Your password":"At least 8 characters"}" required minlength="8" autocomplete="${t?"current-password":"new-password"}" />
              </div>
              <p id="auth-error" class="hidden text-sm text-red-400"></p>
              <button type="submit" id="auth-submit" class="btn btn-gradient w-full text-base py-3">
                ${t?"Sign in":"Create account"}
              </button>
            </form>

            <p class="mt-4 text-center text-[11px] text-zinc-500">AiAS v1.2 \xB7 powered by NEDB \xB7 Interchained</p>
          </div>
        </div>
      </div>
    `;let s=this.container.querySelector("video");if(s){let i=document.createElement("source");i.src="/static/devnet-intro.mp4",i.type="video/mp4",s.appendChild(i),s.load()}document.getElementById("auth-tab-login").addEventListener("click",()=>this.showAuthLanding("login")),document.getElementById("auth-tab-signup").addEventListener("click",()=>this.showAuthLanding("signup")),document.getElementById("auth-form").addEventListener("submit",async i=>{i.preventDefault();let a=i.target,n=new FormData(a),l=document.getElementById("auth-submit");l.disabled=!0,l.textContent=t?"Signing in\u2026":"Creating account\u2026";try{let o={email:String(n.get("email")||""),password:String(n.get("password")||"")};t||(o.display_name=String(n.get("display_name")||""));let r=await fetch(t?"/api/auth/login":"/api/auth/signup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(o)}),c=await r.json();if(c.requires_2fa&&c.pending_token){this.showAuthTwoFactor(c.pending_token);return}if(r.ok&&c.success&&c.session_token){localStorage.setItem(he,c.session_token),this.appState={mode:"app",user:c.user,hash:c.session_token},this.showApp();return}this.showAuthError(c.error||"Something went wrong. Please try again.")}catch{this.showAuthError("Network error. Please try again.")}finally{l.disabled=!1,l.textContent=t?"Sign in":"Create account"}})}showAuthError(e){let t=document.getElementById("auth-error");t&&(t.textContent=e,t.classList.remove("hidden"))}showAuthTwoFactor(e){this.container.innerHTML=`
      <div class="relative flex items-center justify-center px-3 sm:px-4" style="height:100dvh;height:100vh;">
        <div class="absolute inset-0 bg-zinc-950" style="z-index:0;"></div>
        <div class="max-w-sm w-full relative" style="z-index:2;">
          <div class="slide-up backdrop-blur-md bg-zinc-900/70 border border-zinc-700/50 rounded-xl p-6 text-center">
            <h2 class="text-xl font-bold mb-1">Two-factor code</h2>
            <p class="text-zinc-400 text-sm mb-4">Enter the 6-digit code from your authenticator app.</p>
            <form id="auth-2fa-form" class="space-y-3">
              <input type="text" name="code" class="input font-mono text-center text-xl tracking-widest" placeholder="000000" maxlength="6" pattern="[0-9]{6}" inputmode="numeric" autocomplete="one-time-code" required />
              <p id="auth-error" class="hidden text-sm text-red-400"></p>
              <button type="submit" class="btn btn-gradient w-full py-3">Verify</button>
            </form>
            <button id="auth-2fa-back" class="mt-3 text-xs text-zinc-500 hover:text-zinc-300">\u2190 Back to sign in</button>
          </div>
        </div>
      </div>
    `,document.getElementById("auth-2fa-back").addEventListener("click",()=>this.showAuthLanding("login")),document.getElementById("auth-2fa-form").addEventListener("submit",async t=>{t.preventDefault();let s=String(new FormData(t.target).get("code")||"");try{let i=await fetch("/api/auth/login-2fa",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pending_token:e,code:s})}),a=await i.json();if(i.ok&&a.success&&a.session_token){localStorage.setItem(he,a.session_token),this.appState={mode:"app",user:a.user,hash:a.session_token},this.showApp();return}this.showAuthError(a.error||"Invalid code.")}catch{this.showAuthError("Network error. Please try again.")}})}startWizard(){this.wizardState={sessionId:this.generateSessionId(),phase:"intro",qualifierStep:0,challengeStep:0,profile:{field:"",experience:"",skills:[],focus:"",interests:[],teamSize:""},talents:[],answers:[]},this.showWizardIntro()}showWizardIntro(){this.container.innerHTML=`
      <div class="relative flex items-center justify-center px-3 sm:px-4" style="height:100dvh;height:100vh;overflow-y:auto;-webkit-overflow-scrolling:touch;">
        <video autoplay muted loop playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;"></video>
        <div class="absolute inset-0 bg-zinc-950/75" style="z-index:1;"></div>
        <canvas id="wizard-glitter-canvas" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;"></canvas>
        
        <div class="max-w-md w-full relative py-4 sm:py-6" style="z-index:3;">
          <div class="text-center slide-up relative overflow-hidden backdrop-blur-md bg-zinc-900/60 border border-zinc-700/50 rounded-xl p-4 sm:p-6">
            <div class="mb-4 sm:mb-5">
              <div class="relative inline-flex items-center justify-center mb-3">
                <div class="absolute bg-emerald-500 rounded-2xl blur-xl opacity-30 animate-pulse" style="width:80px;height:80px;"></div>
                <img src="/static/logo-icon-dark.png" alt="DevNetwork" class="relative animate-float" style="height:64px;object-fit:contain;filter:drop-shadow(0 0 20px rgba(16,185,129,0.4));">
              </div>
              <h1 class="text-2xl sm:text-3xl font-bold mb-1">
                <span class="gradient-text glow-text">DevNetwork</span>
              </h1>
              <p class="text-zinc-300 text-sm sm:text-base">Where builders connect. No paywalls. No gatekeeping.</p>
            </div>

            <div class="flex items-center justify-center gap-4 sm:gap-6 mb-4 sm:mb-5 text-xs sm:text-sm text-zinc-400">
              <span class="flex items-center gap-1.5"><span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">1</span> Tell us about you</span>
              <span class="flex items-center gap-1.5"><span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">2</span> Quick match</span>
              <span class="flex items-center gap-1.5"><span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">3</span> Start building</span>
            </div>
              
            <button id="start-wizard-btn" class="btn btn-gradient w-full text-base sm:text-lg py-3 sm:py-4 glow-border animate-pulse-glow mb-3">
              <span class="flex items-center justify-center gap-2">
                \u{1F680} Let's Go
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                </svg>
              </span>
            </button>
              
            <button id="link-device-btn" class="text-xs sm:text-sm text-zinc-400 hover:text-emerald-400 transition-colors flex items-center justify-center gap-1.5 mx-auto pt-2">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
              Already have an account? Link this device
            </button>
          </div>
        </div>
      </div>
    `;let e=this.container.querySelector("video");if(e){let s=document.createElement("source");s.src="/static/devnet-intro.mp4",s.type="video/mp4",e.appendChild(s),e.load()}document.getElementById("start-wizard-btn").addEventListener("click",()=>{this.wizardState.phase="qualifier",this.showQualifier()}),document.getElementById("link-device-btn").addEventListener("click",()=>{this.showLinkDevice()});let t=document.getElementById("wizard-glitter-canvas");if(t){let s=t.getContext("2d"),i,a,n=[],l=()=>{t.parentElement&&(i=t.width=t.parentElement.offsetWidth,a=t.height=t.parentElement.offsetHeight)};l(),window.addEventListener("resize",l);for(let r=0;r<300;r++)n.push({x:Math.random()*(i||800),y:Math.random()*(a||600),r:Math.random()*2+.5,dx:(Math.random()-.5)*.4,dy:(Math.random()-.5)*.4,twinkle:Math.random()*Math.PI*2,speed:.02+Math.random()*.04,green:Math.random()>.5});let o=()=>{if(document.getElementById("wizard-glitter-canvas")){s.clearRect(0,0,i,a);for(let r of n){r.x+=r.dx,r.y+=r.dy,r.twinkle+=r.speed,r.x<0&&(r.x=i),r.x>i&&(r.x=0),r.y<0&&(r.y=a),r.y>a&&(r.y=0);let c=.3+Math.abs(Math.sin(r.twinkle))*.7;s.beginPath(),s.arc(r.x,r.y,r.r,0,Math.PI*2),s.fillStyle=r.green?`rgba(16,185,129,${c})`:`rgba(255,255,255,${c})`,s.fill()}requestAnimationFrame(o)}};o()}}showLinkDevice(){this.container.innerHTML=`
      <div class="max-w-lg mx-auto px-4 py-8">
        <div class="card-elevated slide-up">
          <button id="back-to-intro" class="text-zinc-400 hover:text-emerald-400 mb-4 flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
          
          <h2 class="text-xl font-bold text-zinc-100 mb-2">Link This Device</h2>
          <p class="text-zinc-400 mb-6">Enter your login hash and 2FA code to link this device to your account.</p>
          
          <div class="bg-zinc-800/50 rounded-xl p-4 mb-4 border border-zinc-700">
            <p class="text-sm text-zinc-400">
              <strong class="text-zinc-200">Where to find your hash:</strong> Go to your profile on a linked device and copy your login hash from there.
            </p>
          </div>
          
          <form id="link-form" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-zinc-300 mb-1">Your Login Hash</label>
              <input type="text" name="hash" class="input font-mono text-sm" placeholder="Paste your hash here..." required />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-zinc-300 mb-1">2FA Code from Authenticator App</label>
              <input type="text" name="totp_code" class="input font-mono text-center text-xl tracking-widest" placeholder="000000" maxlength="6" pattern="[0-9]{6}" required />
            </div>
            
            <button type="submit" class="btn btn-primary w-full py-3">
              Link Device
            </button>
            
            <p id="link-error" class="text-red-500 text-sm text-center hidden"></p>
          </form>
        </div>
      </div>
    `,document.getElementById("back-to-intro").addEventListener("click",()=>{this.showWizardIntro()}),document.getElementById("link-form").addEventListener("submit",async e=>{e.preventDefault(),await this.linkDevice()})}async linkDevice(){let e=document.getElementById("link-form"),t=new FormData(e),s=t.get("hash").trim(),i=t.get("totp_code").trim(),a=await this.getFingerprint(),n=e.querySelector('button[type="submit"]'),l=document.getElementById("link-error");n.disabled=!0,n.innerHTML=`
      <svg class="w-5 h-5 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
    `,l.classList.add("hidden");try{let o=await fetch("/api/auth/link-device",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({existing_hash:s,fingerprint:a,totp_code:i})}),r=await o.json();if(o.ok&&r.success)localStorage.setItem(he,r.hash),this.appState={mode:"app",user:r.user,hash:r.hash},this.showApp();else throw new Error(r.detail||r.error||"Invalid hash, 2FA code, or account not found")}catch{l.textContent="Could not link device. Please check your hash and try again.",l.classList.remove("hidden"),n.disabled=!1,n.textContent="Try Again"}}showQualifier(){if(!this.wizardState)return;if(this.wizardState.qualifierStep>=ot.length){this.transitionToChallenge();return}let e=ot[this.wizardState.qualifierStep];this.selectedSkills=[];let t=this.wizardState.qualifierStep/ot.length*100,i={field:["\u{1F4BB}","\u{1F4F1}","\u{1F3A8}","\u{1F4CA}","\u{1F680}","\u{1F3AF}"],experience:["\u{1F331}","\u{1F4DA}","\u{1F4AA}","\u2B50","\u{1F3C6}","\u{1F451}"],skills:["\u{1F4BB}","\u{1F40D}","\u269B\uFE0F","\u{1F527}","\u{1F4F1}","\u2601\uFE0F","\u{1F916}","\u{1F3A8}","\u{1F5C4}\uFE0F","\u26D3\uFE0F","\u{1F529}","\u{1F3AE}","\u{1F512}","\u270D\uFE0F","\u{1F4CA}","\u{1F310}"],interests:["\u{1F680}","\u{1F310}","\u{1F50D}","\u{1F3D7}\uFE0F","\u{1F4C8}","\u{1F6E0}\uFE0F","\u{1F4F0}","\u{1F3C6}","\u{1F527}","\u{1F4A1}","\u{1F3E0}","\u{1F465}"],focus:["\u{1F3AF}","\u{1F680}","\u{1F4B0}","\u{1F30D}","\u{1F91D}","\u{1F4C8}"],teamSize:["\u{1F9D1}","\u{1F465}","\u{1F3E2}","\u{1F310}","\u{1F937}","\u{1F4AB}"]}[e.id]||["\u2728","\u26A1","\u{1F3AF}","\u{1F4A1}","\u{1F525}","\u{1F680}"];this.container.innerHTML=`
      <div class="max-w-lg mx-auto px-4 py-8" style="max-height:100vh;overflow-y:auto;">
        <div class="card slide-up">
          <div class="mb-8">
            <div class="flex items-center justify-between text-sm text-zinc-400 mb-3">
              <span class="flex items-center gap-2">
                <span class="text-lg">\u{1F3AF}</span>
                Profile Setup
              </span>
              <span class="bg-zinc-800 px-3 py-1 rounded-full font-medium text-emerald-400">
                ${this.wizardState.qualifierStep+1} / ${ot.length}
              </span>
            </div>
            <div class="wizard-progress-bar">
              <div class="wizard-progress-fill" style="width: ${t}%"></div>
            </div>
          </div>
          
          <h2 class="text-2xl font-bold text-zinc-100 mb-2 gradient-text">${e.question}</h2>
          <p class="text-zinc-500 mb-6 text-sm">Select the option that best describes you</p>
          
          <div class="space-y-3" id="options-container">
            ${e.options.map((a,n)=>`
              <button class="wizard-option touch-bounce flex items-center gap-4 stagger-${Math.min(n+1,5)}" data-value="${a.value}" data-index="${n}" style="animation: slide-in-right 0.4s ease-out backwards; animation-delay: ${n*.08}s">
                <span class="option-emoji text-2xl">${i[n]||"\u2728"}</span>
                ${e.multiSelect?`
                  <div class="w-6 h-6 rounded-lg border-2 border-zinc-600 flex items-center justify-center checkbox-box transition-all duration-300">
                    <svg class="w-4 h-4 text-white hidden check-icon" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                  </div>
                `:""}
                <span class="text-zinc-200 font-medium flex-1 text-left">${a.label}</span>
                <svg class="w-5 h-5 text-zinc-600 group-hover:text-emerald-400 transition-colors arrow-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            `).join("")}
          </div>
          
          ${e.multiSelect?`
            <button id="continue-btn" class="btn btn-gradient w-full mt-8 py-4 text-lg font-semibold" disabled>
              <span class="flex items-center justify-center gap-2">
                Continue
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                </svg>
              </span>
            </button>
          `:""}
        </div>
      </div>
    `,e.multiSelect?(this.container.querySelectorAll(".wizard-option").forEach(a=>{a.addEventListener("click",n=>{let l=n.currentTarget,o=l.dataset.value,r=l.querySelector(".check-icon"),c=l.querySelector(".checkbox-box");this.selectedSkills.includes(o)?(this.selectedSkills=this.selectedSkills.filter(f=>f!==o),l.classList.remove("selected"),r?.classList.add("hidden"),c?.classList.remove("bg-emerald-500","border-emerald-500")):(this.selectedSkills.push(o),l.classList.add("selected"),r?.classList.remove("hidden"),c?.classList.add("bg-emerald-500","border-emerald-500"));let m=document.getElementById("continue-btn");m.disabled=this.selectedSkills.length===0})}),document.getElementById("continue-btn").addEventListener("click",()=>{this.saveQualifierAnswer(e.id,this.selectedSkills)})):this.container.querySelectorAll(".wizard-option").forEach(a=>{a.addEventListener("click",n=>{let l=n.currentTarget,o=l.dataset.value;this.container.querySelectorAll(".wizard-option").forEach(r=>r.classList.remove("selected")),l.classList.add("selected"),setTimeout(()=>this.saveQualifierAnswer(e.id,o),200)})})}async saveQualifierAnswer(e,t){if(this.wizardState){e==="field"?this.wizardState.profile.field=t:e==="experience"?this.wizardState.profile.experience=t:e==="skills"?this.wizardState.profile.skills=t:e==="focus"?this.wizardState.profile.focus=t:e==="interests"?this.wizardState.profile.interests=t:e==="teamSize"&&(this.wizardState.profile.teamSize=t);try{await fetch("/api/wizard/step",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:this.wizardState.sessionId,step:this.wizardState.qualifierStep+1,answer:{[e]:t},phase:"qualifier"})})}catch(s){console.error("Failed to save step:",s)}this.wizardState.qualifierStep++,this.showQualifier()}}async transitionToChallenge(){this.wizardState&&(this.container.innerHTML=`
      <div class="max-w-lg mx-auto px-4 py-8">
        <div class="card-elevated text-center slide-up">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 mb-4">
            <svg class="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h2 class="text-xl font-bold text-warm-gray-800 mb-2">Profile Captured</h2>
          <p class="text-warm-gray-600 mb-4">
            <span class="font-medium text-emerald-600">${this.getFieldLabel()}</span> with 
            <span class="font-medium">${this.getExperienceLabel()}</span> experience
          </p>
          <p class="text-warm-gray-500 text-sm mb-4">Now let's discover your unique talents...</p>
          <div class="flex items-center justify-center gap-1">
            <div class="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
            <div class="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
            <div class="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
          </div>
        </div>
      </div>
    `,await this.delay(2e3),this.wizardState.phase="challenge",this.showCurrentPuzzle())}getFieldLabel(){return{founder:"Founder",developer:"Developer",designer:"Designer",marketer:"Growth Marketer",product:"Product Manager",freelancer:"Freelancer"}[this.wizardState?.profile.field||""]||"Builder"}getExperienceLabel(){return{exploring:"exploring ideas",building:"building first product",shipped:"finding product-market fit",scaling:"scaling up"}[this.wizardState?.profile.experience||""]||""}getRelevantPuzzles(){return[...ra].slice(0,5)}showCurrentPuzzle(){if(!this.wizardState)return;let e=this.getRelevantPuzzles();if(this.wizardState.challengeStep>=e.length){this.showCompletion();return}let t=e[this.wizardState.challengeStep],s=this.wizardState.challengeStep/e.length*100;this.container.innerHTML=`
      <div class="max-w-lg mx-auto px-4 py-8">
        <div class="card-elevated slide-up">
          <div class="mb-6">
            <div class="flex items-center justify-between text-sm text-warm-gray-500 mb-2">
              <span class="flex items-center gap-2">
                <svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
                Challenge Mode
              </span>
              <span>${this.wizardState.challengeStep+1} of ${e.length}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${s}%"></div>
            </div>
          </div>
          
          <div class="bg-warm-gray-800 rounded-xl p-4 mb-4 font-mono text-sm">
            <pre class="text-emerald-400 whitespace-pre-wrap">${t.question}</pre>
          </div>
          
          <p class="text-warm-gray-500 text-sm mb-4 italic">${t.hint}</p>
          
          <div class="space-y-3" id="puzzle-options">
            ${t.options.map((a,n)=>`
              <button class="wizard-option flex items-center gap-3" data-option="${n}">
                <span class="w-8 h-8 rounded-lg bg-warm-gray-100 flex items-center justify-center font-mono text-warm-gray-600 font-medium">
                  ${String.fromCharCode(65+n)}
                </span>
                <span class="text-warm-gray-700">${a}</span>
              </button>
            `).join("")}
          </div>
          
          ${this.wizardState.talents.length>0?`
            <div class="mt-6 pt-4 border-t border-warm-gray-100">
              <p class="text-xs text-warm-gray-400 mb-2">Talents discovered:</p>
              <div class="flex flex-wrap gap-2">
                ${this.wizardState.talents.map(a=>`
                  <span class="badge badge-talent">${a}</span>
                `).join("")}
              </div>
            </div>
          `:""}
        </div>
      </div>
    `,this.container.querySelectorAll(".wizard-option").forEach(a=>{a.addEventListener("click",n=>{let l=n.currentTarget,o=parseInt(l.dataset.option);this.selectPuzzleOption(o)})});let i=a=>{let n=a.key.toUpperCase();if(n>="A"&&n<="C"){let l=n.charCodeAt(0)-65;l<t.options.length&&(this.selectPuzzleOption(l),document.removeEventListener("keydown",i))}};document.addEventListener("keydown",i)}async selectPuzzleOption(e){if(!this.wizardState)return;let i=this.getRelevantPuzzles()[this.wizardState.challengeStep].options[e];this.wizardState.answers.push(i),this.container.querySelector(`[data-option="${e}"]`).classList.add("selected");try{let l=await(await fetch("/api/wizard/step",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:this.wizardState.sessionId,step:this.wizardState.challengeStep+1,answer:i,phase:"challenge"})})).json();l.talent_discovered&&(this.wizardState.talents.push(l.talent_discovered),await this.showTalentReveal(l.talent_discovered))}catch(n){console.error("Failed to submit:",n)}this.wizardState.challengeStep++,await this.delay(300),this.showCurrentPuzzle()}async showTalentReveal(e){let t=document.createElement("div");t.className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 fade-in",t.innerHTML=`
      <div class="bg-zinc-900 border border-emerald-500/30 rounded-2xl p-8 text-center shadow-elevated slide-up max-w-sm mx-4">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 mb-4">
          <span class="text-3xl">\u{1F3F7}\uFE0F</span>
        </div>
        <h3 class="text-lg font-bold text-zinc-100 mb-2">Talent Discovered!</h3>
        <p class="badge badge-talent text-base px-4 py-2">${e}</p>
      </div>
    `,document.body.appendChild(t),await this.delay(1500),t.remove()}showCompletion(){this.wizardState&&(this.container.innerHTML=`
      <div class="max-w-lg mx-auto px-3 sm:px-4 py-4 sm:py-8" style="height:100dvh;height:100vh;overflow-y:auto;-webkit-overflow-scrolling:touch;">
        <div class="card-elevated slide-up">
          <div class="text-center mb-6">
            <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 mb-4">
              <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-warm-gray-800 mb-2">Challenge Complete!</h2>
            <p class="text-warm-gray-500">You've proven yourself. Now join the network.</p>
          </div>
          
          <div class="bg-warm-gray-50 rounded-xl p-4 mb-6">
            <h3 class="font-semibold text-warm-gray-700 mb-3">Your Profile</h3>
            <div class="flex flex-wrap gap-2 mb-3">
              <span class="badge badge-field">${this.getFieldLabel()}</span>
              <span class="badge bg-warm-gray-200 text-warm-gray-700">${this.getExperienceLabel()}</span>
            </div>
            <div class="flex flex-wrap gap-2 mb-3">
              ${this.wizardState.profile.skills.map(e=>`
                <span class="badge badge-skill">${e}</span>
              `).join("")}
            </div>
            ${this.wizardState.talents.length>0?`
              <div class="pt-3 border-t border-warm-gray-200">
                <p class="text-xs text-warm-gray-500 mb-2">Talents Discovered</p>
                <div class="flex flex-wrap gap-2">
                  ${this.wizardState.talents.map(e=>`
                    <span class="badge badge-talent">${e}</span>
                  `).join("")}
                </div>
              </div>
            `:""}
          </div>
          
          <form id="complete-form" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-warm-gray-700 mb-1">Display Name</label>
              <input type="text" name="displayName" class="input" placeholder="How should we call you?" required />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-warm-gray-700 mb-1">One-liner Bio</label>
              <input type="text" name="bio" class="input" placeholder="What do you do in 10 words or less?" maxlength="100" />
            </div>
            
            <div><label class="block text-sm font-medium text-warm-gray-700 mb-1">Email Address <span class="text-zinc-500">(optional)</span></label><input type="email" name="email" class="input" placeholder="your@email.com" /></div>
            <div><label class="block text-sm font-medium text-warm-gray-700 mb-1">LinkedIn or Portfolio <span class="text-emerald-400">*</span></label><input type="url" name="portfolio" class="input" placeholder="https://linkedin.com/in/you or https://yoursite.com" required /><p class="text-xs text-zinc-500 mt-1">Must start with https://</p></div>
            <button type="submit" class="btn btn-primary w-full py-2.5 sm:py-3 text-base sm:text-lg">
              Join DevNetwork
            </button>
          </form>
        </div>
        <div style="height:2rem;"></div>
      </div>
    `,document.getElementById("complete-form").addEventListener("submit",e=>{e.preventDefault(),this.completeWizard()}))}async completeWizard(){if(!this.wizardState)return;let e=document.getElementById("complete-form"),t=new FormData(e),s=await this.getFingerprint(),i=t.get("displayName"),a=e.querySelector('button[type="submit"]'),n=e.querySelector(".error-message");a.disabled=!0,a.innerHTML=`
      <svg class="w-5 h-5 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
    `;try{let o=await(await fetch("/api/auth/check-username",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:i})})).json();if(!o.available)throw new Error(o.error||"Username already taken. Please choose a different name.");let r=await fetch("/api/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fingerprint:s,session_id:this.wizardState.sessionId,profile:{displayName:t.get("displayName"),bio:t.get("bio")||"",email:t.get("email")||"",portfolio:t.get("portfolio"),...this.wizardState.profile},age_confirmed:!0,talents:this.wizardState.talents})});if(r.ok){let c=await r.json();c.requires_2fa?this.show2FASetup(c.user,c.hash,c.totp_secret):(localStorage.setItem(he,c.hash),this.appState={mode:"app",user:c.user,hash:c.hash},this.showWelcome(c.user))}else{let c=await r.json();throw new Error(c.error||"Registration failed")}}catch(l){console.error("Registration failed:",l),a.disabled=!1,a.textContent="Try Again",n&&(n.textContent=l.message||"Registration failed",n.classList.remove("hidden"))}}show2FASetup(e,t,s){let i=`otpauth://totp/DevNetwork:${encodeURIComponent(e.displayName)}?secret=${s}&issuer=DevNetwork`;this.container.innerHTML=`
      <div class="max-w-lg mx-auto px-3 sm:px-4 py-3 sm:py-6" style="height:100dvh;height:100vh;overflow-y:auto;-webkit-overflow-scrolling:touch;">
        <div class="card slide-up">
          <div class="text-center mb-4 sm:mb-6">
            <div class="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 mb-3 shadow-lg shadow-emerald-500/25">
              <svg class="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
            <h2 class="text-xl sm:text-2xl font-bold gradient-text">Secure Your Account</h2>
            <p class="text-zinc-400 mt-1 text-sm">Two-factor authentication is required</p>
          </div>
          
          <div class="space-y-3 sm:space-y-4">
            <div class="bg-zinc-800/50 rounded-xl p-3 sm:p-4 border border-zinc-700/50">
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Your Login Hash</p>
                <button id="copy-hash-btn" class="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                  </svg>
                  Copy
                </button>
              </div>
              <code id="hash-display" class="text-[10px] sm:text-xs text-zinc-300 font-mono break-all block bg-zinc-900/50 p-2 sm:p-3 rounded-lg select-all">${t}</code>
              <p class="text-[10px] sm:text-xs text-amber-400 mt-2 flex items-center gap-1">
                <svg class="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                Save this hash! You'll need it to log in from other devices.
              </p>
            </div>
            
            <div class="bg-zinc-800/50 rounded-xl p-3 sm:p-4 border border-zinc-700/50">
              <h3 class="text-sm font-semibold text-zinc-100 mb-2 flex items-center gap-2">
                <span class="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                Install Google Authenticator
              </h3>
              <p class="text-xs sm:text-sm text-zinc-400 mb-2">Download from your app store if you haven't already.</p>
              <div class="flex gap-2">
                <a href="https://apps.apple.com/app/google-authenticator/id388497605" target="_blank" class="flex-1 btn btn-secondary text-xs py-2">
                  iOS
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" target="_blank" class="flex-1 btn btn-secondary text-xs py-2">
                  Android
                </a>
              </div>
            </div>
            
            <div class="bg-zinc-800/50 rounded-xl p-3 sm:p-4 border border-zinc-700/50">
              <h3 class="text-sm font-semibold text-zinc-100 mb-2 flex items-center gap-2">
                <span class="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                Add Your Account
              </h3>
              <p class="text-xs sm:text-sm text-zinc-400 mb-2">Scan the QR code or enter the setup key manually:</p>
              
              <div id="qr-container" class="hidden mb-3">
                <div class="bg-white p-3 rounded-xl inline-block mx-auto">
                  <img id="qr-code-img" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(i)}" alt="QR Code" class="w-36 h-36 sm:w-44 sm:h-44">
                </div>
              </div>
              
              <button id="toggle-qr-btn" class="btn btn-secondary w-full mb-2 text-xs sm:text-sm py-2">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
                </svg>
                <span id="qr-btn-text">Show QR Code</span>
              </button>
              
              <div class="relative">
                <code id="totp-secret-display" class="text-[10px] sm:text-sm text-emerald-400 font-mono tracking-wide block bg-zinc-900/50 p-2 sm:p-3 rounded-lg text-center break-all select-all">${s}</code>
                <button id="copy-secret-btn" class="absolute right-1 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-emerald-400 p-1.5">
                  <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                  </svg>
                </button>
              </div>
              <p class="text-[10px] sm:text-xs text-zinc-500 mt-1">Account: DevNetwork (${e.displayName})</p>
            </div>
            
            <div class="bg-zinc-800/50 rounded-xl p-3 sm:p-4 border border-zinc-700/50">
              <h3 class="text-sm font-semibold text-zinc-100 mb-2 flex items-center gap-2">
                <span class="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                Verify Your Code
              </h3>
              <p class="text-xs sm:text-sm text-zinc-400 mb-2">Enter the 6-digit code from your authenticator app.</p>
              <form id="verify-2fa-form" class="space-y-2 sm:space-y-3">
                <input type="text" id="totp-code" name="code" 
                  class="input text-center text-xl sm:text-2xl tracking-[0.4em] sm:tracking-[0.5em] font-mono" 
                  placeholder="000000" maxlength="6" pattern="[0-9]{6}" 
                  autocomplete="one-time-code" inputmode="numeric" required>
                <p id="2fa-error" class="text-sm text-red-400 hidden"></p>
                <button type="submit" class="btn btn-primary w-full py-2.5 sm:py-3 text-sm sm:text-base">
                  Enable 2FA & Continue
                </button>
              </form>
            </div>
          </div>
        </div>
        <div style="height:2rem;"></div>
      </div>
    `,document.getElementById("copy-hash-btn")?.addEventListener("click",()=>{navigator.clipboard.writeText(t);let l=document.getElementById("copy-hash-btn");l.innerHTML='<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Copied!',setTimeout(()=>{l.innerHTML='<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg> Copy'},2e3)}),document.getElementById("copy-secret-btn")?.addEventListener("click",()=>{navigator.clipboard.writeText(s);let l=document.getElementById("copy-secret-btn");l.innerHTML='<svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',setTimeout(()=>{l.innerHTML='<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>'},2e3)}),document.getElementById("toggle-qr-btn")?.addEventListener("click",()=>{let l=document.getElementById("qr-container"),o=document.getElementById("qr-btn-text");if(l&&o){let r=l.classList.contains("hidden");l.classList.toggle("hidden"),o.textContent=r?"Hide QR Code":"Show QR Code"}});let a=document.getElementById("verify-2fa-form"),n=document.getElementById("totp-code");n.addEventListener("input",l=>{let o=l.target;o.value=o.value.replace(/\D/g,"").slice(0,6)}),a.addEventListener("submit",async l=>{l.preventDefault();let o=n.value,r=document.getElementById("2fa-error"),c=a.querySelector('button[type="submit"]');if(o.length!==6){r.textContent="Please enter a 6-digit code",r.classList.remove("hidden");return}c.disabled=!0,c.innerHTML='<svg class="w-5 h-5 animate-spin mx-auto" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>',r.classList.add("hidden");try{let m=await fetch("/api/auth/verify-2fa",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:e.id,code:o})}),f=await m.json();if(m.ok&&f.success)localStorage.setItem(he,t),f.device_token&&localStorage.setItem(Fe,f.device_token),this.appState={mode:"app",user:e,hash:t},this.showNetworkReveal(e,f.matched_groups||[]);else throw new Error(f.error||"Verification failed")}catch(m){r.textContent=m.message||"Invalid code. Please try again.",r.classList.remove("hidden"),c.disabled=!1,c.innerHTML='<svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg> Enable 2FA & Continue',n.value="",n.focus()}}),n.focus()}async showWelcome(e){this.container.innerHTML=`
      <div class="max-w-lg mx-auto px-4 py-8">
        <div class="card text-center slide-up">
          <div class="relative inline-block mb-4">
            <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600">
              <span class="text-3xl font-bold text-white">${e.displayName.charAt(0).toUpperCase()}</span>
            </div>
            <div class="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-emerald-500 rounded-full blur opacity-30 -z-10"></div>
          </div>
          <h2 class="text-2xl font-bold text-zinc-100 mb-2">Welcome, ${e.displayName}!</h2>
          <p class="text-zinc-400 mb-6">Your account is secured with 2FA. You're ready to go!</p>
          
          <div class="flex items-center justify-center gap-2 text-sm text-emerald-400 mb-6">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
            Two-factor authentication enabled
          </div>
          
          <button id="enter-app-btn" class="btn btn-primary w-full py-3 text-lg">
            Enter DevNetwork
          </button>
        </div>
      </div>
    `,document.getElementById("enter-app-btn").addEventListener("click",()=>{this.showApp()})}showNetworkReveal(e,t){let s=t.length;this.container.innerHTML=`
      <style>
        @keyframes countUp { 0% { opacity: 0; transform: scale(0.5); } 50% { transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes groupReveal { 0% { opacity: 0; transform: translateY(20px) scale(0.9); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.3); } 50% { box-shadow: 0 0 40px rgba(16, 185, 129, 0.6); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .network-count { animation: countUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .group-chip { animation: groupReveal 0.4s ease-out backwards; }
        .pulse-glow { animation: pulseGlow 2s ease-in-out infinite; }
        .shimmer-text { background: linear-gradient(90deg, #10b981, #34d399, #6ee7b7, #10b981); background-size: 200% 100%; animation: shimmer 3s linear infinite; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      </style>
      <div class="max-w-2xl mx-auto px-4 py-8">
        <div class="card text-center slide-up">
          <div class="mb-6">
            <img src="/static/logo-icon-dark.png" alt="DevNetwork" style="height: 64px; object-fit: contain; margin: 0 auto 16px; display: block; filter: drop-shadow(0 0 20px rgba(16, 185, 129, 0.4));" class="pulse-glow">
            <h2 class="text-3xl font-bold mb-2">
              <span class="shimmer-text">Network Activated</span>
            </h2>
            <p class="text-zinc-400">Welcome, ${e.displayName}!</p>
          </div>
          
          <div class="bg-zinc-900/50 rounded-2xl p-6 mb-6 border border-zinc-800">
            <div class="text-6xl font-bold text-emerald-400 network-count mb-2">${s}</div>
            <p class="text-zinc-400 text-lg">Communities matched to your profile</p>
          </div>
          
          ${s>0?`
            <div class="mb-6">
              <p class="text-sm text-zinc-500 mb-4">You've been auto-joined to:</p>
              <div class="flex flex-wrap justify-center gap-2 max-h-48 overflow-y-auto">
                ${t.map((i,a)=>`
                  <div class="group-chip inline-flex items-center gap-2 px-3 py-2 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg border border-zinc-700 hover:border-emerald-500/50 transition-all cursor-pointer" style="animation-delay: ${a*.05}s" title="${i.description||""}">
                    <div class="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500/20 to-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">
                      ${i.name.charAt(0)}
                    </div>
                    <span class="text-sm text-zinc-200">${i.name}</span>
                  </div>
                `).join("")}
              </div>
            </div>
          `:""}
          
          <div class="flex items-center justify-center gap-2 text-sm text-emerald-400 mb-6">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
            2FA secured account
          </div>
          
          <button id="enter-network-btn" class="btn btn-gradient w-full py-4 text-lg font-semibold glow-border">
            <span class="flex items-center justify-center gap-2">
              Enter Your Network
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
            </span>
          </button>
        </div>
      </div>
    `,document.getElementById("enter-network-btn").addEventListener("click",()=>{this.showApp()})}showApp(){let e=this.appState.user;if(!e)return;document.getElementById("sidebar")?.classList.remove("hidden"),window.lucide&&window.lucide.createIcons();let t=document.getElementById("nav-avatar-container"),s=document.getElementById("nav-profile-name");t&&(e.avatar?t.innerHTML=`<img src="${e.avatar}" alt="${e.displayName}" class="w-full h-full object-cover">`:t.innerHTML=`<span>${e.displayName.charAt(0).toUpperCase()}</span>`),s&&(s.textContent=e.displayName),(e.is_admin||e.is_superadmin)&&document.getElementById("nav-admin")?.classList.remove("hidden"),this.loadUserEcosystems();let i=document.getElementById("status-user");i&&(i.textContent=`@${e.displayName}`,i.classList.remove("hidden")),this.setActiveNav("nav-feed"),this.setContent(`
      <div class="h-full w-full flex flex-col">
        <div class="panel flex-1">
          <div class="panel-header">
            <div class="flex items-center gap-3">
              <span class="panel-title">Feed</span>
              <span class="text-xs text-zinc-500">Stay connected with your network</span>
            </div>
            <button id="new-post-btn" class="btn btn-primary text-xs py-1.5 px-3">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              New Post
            </button>
          </div>
          <div class="panel-body p-4">
            <div id="compose-area" class="hidden bg-zinc-800/50 rounded-lg p-4 mb-4 border border-zinc-700">
              <textarea id="post-content" class="input resize-none bg-zinc-900 text-sm" rows="3" placeholder="What's on your mind? Use @mentions and #hashtags!"></textarea>
              <div id="image-preview-container" class="hidden mt-3 relative">
                <img id="image-preview" class="max-h-32 rounded-lg object-cover" alt="Preview">
                <button id="remove-image" class="absolute top-2 right-2 bg-zinc-900/80 text-zinc-300 hover:text-white rounded-full p-1">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div class="flex items-center justify-between mt-3">
                <label class="btn btn-ghost text-xs cursor-pointer py-1 px-2">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  Image
                  <input type="file" id="post-image-input" accept="image/jpeg,image/png,image/gif,image/webp" class="hidden">
                </label>
                <button id="post-gif-btn" class="btn btn-ghost text-xs py-1 px-2" type="button">
                  <svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="2" width="20" height="20" rx="2"/>
                    <text x="12" y="16" text-anchor="middle" fill="currentColor" stroke="none" font-size="10" font-weight="bold">GIF</text>
                  </svg>
                  GIF
                </button>
                <div class="flex gap-2">
                  <button id="cancel-post" class="btn btn-ghost text-xs py-1 px-2">Cancel</button>
                  <button id="submit-post" class="btn btn-primary text-xs py-1 px-2">Post</button>
                </div>
              </div>
              <p id="upload-error" class="text-red-400 text-xs mt-2 hidden"></p>
            </div>
            
            <div id="feed-container" class="space-y-3">
              ${this.renderFeedShimmers()}
            </div>
          </div>
        </div>
      </div>
    `,"feed"),this.setupFeedListeners(),this.loadFeed()}pendingImageUrl=null;toggleSidebar(){let e=document.getElementById("sidebar");e&&(e.classList.contains("sidebar-expanded")?this.collapseSidebar():this.expandSidebar())}collapseSidebar(){let e=document.getElementById("sidebar");if(!e)return;e.classList.remove("sidebar-expanded"),e.classList.add("sidebar-collapsed"),document.querySelector(".sidebar-collapse-icon")?.classList.add("hidden"),document.querySelector(".sidebar-expand-icon")?.classList.remove("hidden");let t=document.getElementById("sidebar-toggle");t&&(t.title="Expand sidebar"),localStorage.setItem("sidebar-collapsed","true")}expandSidebar(){let e=document.getElementById("sidebar");if(!e)return;e.classList.remove("sidebar-collapsed"),e.classList.add("sidebar-expanded"),document.querySelector(".sidebar-collapse-icon")?.classList.remove("hidden"),document.querySelector(".sidebar-expand-icon")?.classList.add("hidden");let t=document.getElementById("sidebar-toggle");t&&(t.title="Collapse sidebar"),localStorage.setItem("sidebar-collapsed","false")}setActiveNav(e){["nav-feed","nav-explore","nav-groups","nav-messages","nav-notifications","nav-geppetto","nav-docs","nav-admin","nav-profile","nav-aias-playground","nav-aias-keystone","nav-aias-artifacts","nav-aias-image","nav-aias-agents"].forEach(s=>{let i=document.getElementById(s);i&&(s===e?i.classList.add("active"):i.classList.remove("active"))})}setupFeedListeners(){document.getElementById("new-post-btn")?.addEventListener("click",()=>{document.getElementById("compose-area")?.classList.remove("hidden"),document.getElementById("post-content")?.focus()}),document.getElementById("cancel-post")?.addEventListener("click",()=>{document.getElementById("compose-area")?.classList.add("hidden"),document.getElementById("post-content").value="",this.clearImagePreview()}),document.getElementById("submit-post")?.addEventListener("click",()=>this.submitPost()),document.getElementById("post-image-input")?.addEventListener("change",t=>{let s=t.target;s.files&&s.files[0]&&this.handleImageSelect(s.files[0])}),document.getElementById("remove-image")?.addEventListener("click",()=>this.clearImagePreview()),document.getElementById("post-gif-btn")?.addEventListener("click",t=>{let s=t.currentTarget;this.openGifDrawer("post",s)}),document.getElementById("nav-feed")?.addEventListener("click",()=>this.showApp()),document.getElementById("nav-explore")?.addEventListener("click",()=>this.showExplore()),document.getElementById("nav-groups")?.addEventListener("click",()=>this.showGroups()),document.getElementById("nav-messages")?.addEventListener("click",()=>this.showMessages()),document.getElementById("nav-admin")?.addEventListener("click",()=>this.showAdmin()),document.getElementById("nav-notifications")?.addEventListener("click",()=>this.showNotifications()),document.getElementById("nav-geppetto")?.addEventListener("click",()=>this.showGeppetto()),document.getElementById("nav-docs")?.addEventListener("click",()=>this.showDocs()),document.getElementById("nav-profile")?.addEventListener("click",()=>this.showProfile()),["playground","keystone","artifacts","image","agents"].forEach(t=>{document.getElementById(`nav-aias-${t}`)?.addEventListener("click",()=>this.showAias(t))}),document.getElementById("sidebar-toggle")?.addEventListener("click",()=>this.toggleSidebar()),localStorage.getItem("sidebar-collapsed")==="true"&&this.collapseSidebar(),this.setupContentClickHandlers(),this.loadNotificationCount(),this.handleGroupRedirect()}async handleGroupRedirect(){let e=window.REDIRECT_GROUP;if(!e)return;window.REDIRECT_GROUP="";let t=this.escapeHtml(e);this.container.innerHTML=`
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:400px;gap:24px;padding:24px;">
        <div style="position:relative;width:80px;height:80px;">
          <div style="position:absolute;inset:0;border-radius:50%;border:3px solid #27272a;"></div>
          <div style="position:absolute;inset:0;border-radius:50%;border:3px solid transparent;border-top-color:#10b981;animation:communitySpinner 0.8s linear infinite;"></div>
          <div style="position:absolute;inset:12px;border-radius:50%;background:linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.1));display:flex;align-items:center;justify-content:center;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
        </div>
        <div style="text-align:center;">
          <h2 style="font-size:20px;font-weight:700;color:#fafafa;margin:0 0 8px 0;">Joining Community</h2>
          <p style="font-size:14px;color:#a1a1aa;margin:0;">Loading <span style="color:#10b981;font-weight:600;">/g/${t}</span></p>
        </div>
        <div style="display:flex;gap:6px;margin-top:8px;">
          <div style="width:8px;height:8px;border-radius:50%;background:#10b981;animation:communityDot 1.2s ease-in-out infinite;"></div>
          <div style="width:8px;height:8px;border-radius:50%;background:#10b981;animation:communityDot 1.2s ease-in-out infinite;animation-delay:0.2s;"></div>
          <div style="width:8px;height:8px;border-radius:50%;background:#10b981;animation:communityDot 1.2s ease-in-out infinite;animation-delay:0.4s;"></div>
        </div>
      </div>
      <style>
        @keyframes communitySpinner { to { transform: rotate(360deg); } }
        @keyframes communityDot { 0%,80%,100% { opacity:0.3;transform:scale(0.8); } 40% { opacity:1;transform:scale(1.2); } }
      </style>
    `;try{let s=await fetch(`/api/groups/by-slug/${e}`,{headers:{"X-Auth-Hash":this.appState.hash||""}});if(s.ok){let i=await s.json();if(i.id){i.is_member||await this.joinGroup(i.id),this.openGroup(i.id);return}}C("Community not found","error"),this.showApp()}catch(s){console.error("Group redirect failed:",s),C("Failed to load community","error"),this.showApp()}}setupContentClickHandlers(){document.addEventListener("click",e=>{let t=e.target;if(t.classList.contains("mention")){e.preventDefault();let s=t.dataset.mention;s&&this.showUserProfile(s)}if(t.classList.contains("hashtag")){e.preventDefault();let s=t.dataset.tag;s&&this.showHashtagFeed(s)}})}async loadNotificationCount(){this._notifDebounce&&clearTimeout(this._notifDebounce),this._notifDebounce=setTimeout(async()=>{try{let e=await fetch("/api/notifications",{headers:{"X-Auth-Hash":this.appState.hash||""}});if(e.ok){let t=await e.json(),s=document.getElementById("notification-badge");s&&(t.unread_count>0?(s.textContent=t.unread_count>99?"99+":String(t.unread_count),s.classList.remove("hidden")):s.classList.add("hidden"))}}catch(e){console.error("Failed to load notifications:",e)}},500)}async showNotifications(){this.setActiveNav("nav-notifications");let e=await fetch("/api/notifications",{headers:{"X-Auth-Hash":this.appState.hash||""}}),t=e.ok?await e.json():{notifications:[],unread_count:0};this.setContent(`
      <div class="h-full w-full flex flex-col">
        <div class="panel flex-1">
          <div class="panel-header">
            <div class="flex items-center gap-3">
              <span class="panel-title">Notifications</span>
              <span class="text-xs text-zinc-500">${t.unread_count} unread</span>
            </div>
            <div class="flex items-center gap-2">
              ${t.unread_count>0?`
                <button id="mark-read-btn" class="btn btn-secondary text-xs py-1 px-2">Mark all read</button>
              `:""}
              ${t.notifications.length>0?`
                <button id="clear-all-notifs-btn" class="btn btn-secondary text-xs py-1 px-2 text-emerald-400 hover:text-emerald-300">Clear all</button>
              `:""}
            </div>
          </div>
          <div class="panel-body">
            ${t.notifications.length===0?`
              <div class="text-center py-12 text-zinc-500">
                <div class="inline-flex items-center justify-center w-12 h-12 bg-zinc-800 rounded-xl mb-3">
                  <svg class="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                  </svg>
                </div>
                <p class="text-sm">No notifications yet</p>
              </div>
            `:t.notifications.map(s=>{let i=s.data?.from_user_name||s.data?.from_user||s.from_user?.displayName||s.last_sender||"Someone",a=s.data?.from_id||s.data?.from_user_id||s.from_user?.id||"",n=s.data?.preview||s.preview||"",l=s.type==="group_message",o=s.group_id||"",r=s.group_name||"Group",c=s.count||1;return`
              <div class="notification-item cursor-pointer hover:bg-zinc-800/50 transition-colors ${s.read?"":"unread"}" data-notification-id="${s.id}" ${l?`data-group-id="${o}"`:`data-from-id="${a}"`} data-type="${s.type||"dm"}">
                <div class="flex items-start gap-3">
                  <div class="relative w-8 h-8 rounded-lg ${l?"bg-blue-500/20":s.type==="bot_approved"?"bg-purple-500/20":"bg-emerald-500/20"} flex items-center justify-center flex-shrink-0">
                    ${l?`
                      <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"/>
                      </svg>
                      ${c>1?`<span class="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">${c>9?"9+":c}</span>`:""}
                    `:s.type==="bot_approved"?`
                      <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    `:`
                      <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                      </svg>
                    `}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-zinc-100">
                      ${l?`<span class="font-semibold text-blue-400">${c>1?c+" messages":"1 message"}</span> in <span class="font-semibold text-zinc-300">${this.escapeHtml(r)}</span>`:s.type==="bot_approved"?`Your bot <span class="font-semibold text-emerald-400">${this.escapeHtml(s.data?.bot_name||s.message?.match(/\*\*(.*?)\*\*/)?.[1]||"your bot")}</span> was approved${s.data?.group_id?" for a group":""}`:s.type==="mention"?`<span class="font-semibold text-emerald-400">@${this.escapeHtml(i)}</span> mentioned you`:s.type==="dm"?`<span class="font-semibold text-emerald-400">@${this.escapeHtml(i)}</span> sent you a message`:s.message?`${s.message.replace(/\*\*(.*?)\*\*/g,'<span class="font-semibold text-emerald-400">$1</span>')}`:`<span class="font-semibold text-emerald-400">@${this.escapeHtml(i)}</span> interacted with you`}
                    </p>
                    <div class="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                      ${l&&c>1?`<span>Latest from ${this.escapeHtml(i)}:</span>`:""}
                      ${s.data?.image_url||s.image_url?`<img src="${s.data?.image_url||s.image_url}" style="max-width: 32px; max-height: 32px; border-radius: 4px; flex-shrink: 0;" />`:""}
                      <span class="truncate">${this.parseMarkdownPreview(n)}</span>
                    </div>
                    <p class="text-xs text-zinc-500 mt-1">${this.formatTime(s.created_at)}</p>
                  </div>
                </div>
              </div>
            `}).join("")}
          </div>
        </div>
      </div>
    `,"notifications"),document.getElementById("mark-read-btn")?.addEventListener("click",async()=>{await fetch("/api/notifications/read",{method:"POST",headers:{"X-Auth-Hash":this.appState.hash||""}});let s=document.getElementById("notification-badge");s&&s.classList.add("hidden"),this.showNotifications()}),document.getElementById("clear-all-notifs-btn")?.addEventListener("click",async()=>{await fetch("/api/notifications",{method:"DELETE",headers:{"X-Auth-Hash":this.appState.hash||""}});let s=document.getElementById("notification-badge");s&&s.classList.add("hidden"),this.loadNotificationCount(),this.showNotifications()}),document.querySelectorAll(".notification-item").forEach(s=>{s.addEventListener("click",async()=>{let i=s,a=i.dataset.notificationId,n=i.dataset.groupId,l=i.dataset.fromId;a&&i.classList.contains("unread")&&(i.classList.remove("unread"),fetch(`/api/notifications/${a}/read`,{method:"POST",headers:{"X-Auth-Hash":this.appState.hash||""}}).then(()=>this.loadNotificationCount())),n?this.openGroup(n):l&&this.openDM(l)})})}async showMessages(){this.setActiveNav("nav-messages");let e=await fetch("/api/dm/conversations",{headers:{"X-Auth-Hash":this.appState.hash||""}}),t=e.ok?await e.json():[];this.setContent(`
      <div class="h-full w-full flex flex-col">
        <div class="flex-1 flex flex-col overflow-hidden bg-zinc-900 border-l border-zinc-800">
          <div class="panel-header">
            <span class="panel-title">Direct Messages</span>
            <span class="text-xs text-zinc-500">${t.length} conversation${t.length!==1?"s":""}</span>
          </div>
          <div class="panel-body flex-1 overflow-y-auto">
            ${t.length===0?`
              <div class="text-center py-12 text-zinc-500">
                <div class="inline-flex items-center justify-center w-12 h-12 bg-zinc-800 rounded-xl mb-3">
                  <svg class="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                </div>
                <p class="text-sm">No conversations yet</p>
                <p class="text-xs text-zinc-600 mt-1">Start a chat from someone's profile</p>
              </div>
            `:t.map(s=>`
              <div class="dm-conversation-item p-3 hover:bg-zinc-800/50 rounded-lg cursor-pointer transition-colors border-b border-zinc-800/50" data-conv-id="${s.id}" data-other-id="${s.other_user?.id}" data-other-name="${this.escapeHtml(s.other_user?.displayName||"Unknown")}">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                    ${s.other_user?.avatar?`<img src="${s.other_user.avatar}" class="w-full h-full object-cover"/>`:`<span class="text-emerald-400 font-bold">${(s.other_user?.displayName||"?")[0].toUpperCase()}</span>`}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <span class="font-medium text-zinc-100">${this.escapeHtml(s.other_user?.displayName||"Unknown")}</span>
                      <span class="text-xs text-zinc-500">${s.last_message?this.formatTime(s.last_message.created_at):""}</span>
                    </div>
                    <p class="text-sm text-zinc-400 truncate mt-0.5 dm-preview-content flex items-center gap-1">
                      ${s.last_message?.image_url?`<img src="${s.last_message.image_url}" style="max-width: 24px; max-height: 24px; border-radius: 4px; flex-shrink: 0;" />`:""}
                      <span>${s.last_message?this.parseMarkdownPreview(s.last_message.content||"")||"[Image]":"No messages yet"}</span>
                    </p>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `),window.lucide&&window.lucide.createIcons(),document.querySelectorAll(".dm-conversation-item").forEach(s=>{s.addEventListener("click",i=>{i.preventDefault(),i.stopPropagation();let a=s.dataset.convId||"",n=s.dataset.otherId||"",l=s.dataset.otherName||"User";a&&n&&this.openDMChat(a,n,l)})})}async openDM(e){if(!e)return;let t=await fetch("/api/dm/conversations",{headers:{"X-Auth-Hash":this.appState.hash||""}}),i=(t.ok?await t.json():[]).find(a=>a.other_user?.id===e);if(i)this.openDMChat(i.id,i.other_user.id,i.other_user.displayName);else{let a=await fetch("/api/dm/start",{method:"POST",headers:{"Content-Type":"application/json","X-Auth-Hash":this.appState.hash||""},body:JSON.stringify({user_id:e})});if(a.ok){let n=await a.json();this.openDMChat(n.id,n.other_user.id,n.other_user.displayName)}}}async openDMChat(e,t,s){let i=await fetch(`/api/dm/${e}/messages`,{headers:{"X-Auth-Hash":this.appState.hash||""}}),a=i.ok?await i.json():[];window.dmPanelInstance={currentConversation:{id:e,otherId:t,otherName:s},addMessageToUI:r=>{if(r.type==="dm_reaction_update"){let m=document.querySelector(`.dm-reactions-display[data-dm-msg-id="${r.message_id}"]`);m&&this.renderReactionBadges(m,r.reactions,"dm",r.message_id,r.conv_id);return}let c=document.getElementById("dm-messages");if(c){let m=c.querySelector(".text-center");m&&m.remove(),c.insertAdjacentHTML("beforeend",this.renderDMMessage(r)),c.scrollTop=c.scrollHeight,this.attachDMReactionListeners(e)}}},this.setContent(`
      <div class="h-full w-full flex flex-col">
        <div class="flex-1 flex flex-col overflow-hidden bg-zinc-900 border-l border-zinc-800">
          <div class="panel-header">
            <div class="flex items-center gap-3">
              <button id="dm-back-btn" class="text-zinc-400 hover:text-zinc-100 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <span class="panel-title">${this.escapeHtml(s)}</span>
            </div>
            <button id="view-dm-profile" class="btn btn-secondary text-xs py-1 px-2" data-user-id="${t}">View Profile</button>
          </div>
          <div id="dm-messages" class="panel-body flex-1 overflow-y-auto flex flex-col gap-2 p-4">
            ${a.length===0?`
              <div class="text-center py-8 text-zinc-500">
                <p class="text-sm">Start a conversation with ${this.escapeHtml(s)}</p>
              </div>
            `:a.map(r=>this.renderDMMessage(r)).join("")}
          </div>
          <div class="border-t border-zinc-800 p-3">
            <div id="dm-image-preview" class="hidden mb-2 relative inline-block">
              <img id="dm-image-preview-img" style="max-width: 80px !important; max-height: 80px !important; width: auto; height: auto; object-fit: contain;" class="rounded-lg" />
              <button id="dm-image-remove" class="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs">&times;</button>
            </div>
            <div class="flex gap-2">
              <button id="dm-image-btn" class="btn btn-secondary px-3" title="Attach image">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </button>
              <button id="dm-gif-btn" class="btn btn-secondary px-3" title="Send GIF" type="button">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2"/><text x="12" y="16" text-anchor="middle" fill="currentColor" stroke="none" font-size="9" font-weight="bold">GIF</text></svg>
              </button>
              <input type="file" id="dm-image-input" accept="image/*" class="hidden">
              <input type="text" id="dm-input" class="input flex-1" placeholder="Type a message... (Markdown supported)">
              <button id="dm-send-btn" class="btn btn-primary">Send</button>
            </div>
          </div>
        </div>
      </div>
    `);let n=document.getElementById("dm-messages");n&&(n.scrollTop=n.scrollHeight),this.attachDMReactionListeners(e),document.getElementById("dm-back-btn")?.addEventListener("click",()=>this.showMessages()),document.getElementById("view-dm-profile")?.addEventListener("click",()=>this.viewUserProfile(t));let l=null;document.getElementById("dm-image-btn")?.addEventListener("click",()=>{document.getElementById("dm-image-input")?.click()}),document.getElementById("dm-image-input")?.addEventListener("change",async r=>{let c=r.target.files?.[0];if(!c)return;let m=document.getElementById("dm-image-btn");m&&(m.innerHTML='<div class="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>');try{let f=new FormData;f.append("file",c);let b=await fetch("/api/upload/image",{method:"POST",headers:{"X-Auth-Hash":this.appState.hash||""},body:f});if(b.ok){let u=await b.json();l=u.url;let h=document.getElementById("dm-image-preview"),v=document.getElementById("dm-image-preview-img");h&&v&&(v.src=u.url,h.classList.remove("hidden"))}}catch(f){console.error("Image upload failed",f)}m&&(m.innerHTML='<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>')}),document.getElementById("dm-image-remove")?.addEventListener("click",()=>{l=null,document.getElementById("dm-image-preview")?.classList.add("hidden")}),document.getElementById("dm-gif-btn")?.addEventListener("click",r=>{let c=r.currentTarget;this.openGifDrawer("dm",c,{convId:e,setPendingImage:m=>{l=m}})});let o=async()=>{let r=document.getElementById("dm-input"),c=r?.value.trim();if(!c&&!l)return;r.value="";let m=l;l=null,document.getElementById("dm-image-preview")?.classList.add("hidden");let f=await fetch(`/api/dm/${e}/messages`,{method:"POST",headers:{"Content-Type":"application/json","X-Auth-Hash":this.appState.hash||""},body:JSON.stringify({content:c,image_url:m})});if(f.ok){let b=await f.json(),u=document.getElementById("dm-messages");if(u){let h=u.querySelector(".text-center");h&&h.remove(),b.user_message&&b.bot_reply?(u.insertAdjacentHTML("beforeend",this.renderDMMessage(b.user_message)),u.insertAdjacentHTML("beforeend",this.renderDMMessage(b.bot_reply))):u.insertAdjacentHTML("beforeend",this.renderDMMessage(b)),u.scrollTop=u.scrollHeight}}};document.getElementById("dm-send-btn")?.addEventListener("click",o),document.getElementById("dm-input")?.addEventListener("keydown",r=>{r.key==="Enter"&&o()})}renderDMMessage(e){let t=e.user_id===this.appState.user?.id,s=this.parseMarkdown(e.content||""),i=this.escapeHtml(e.id||"");return`
      <div class="dm-msg-wrapper flex ${t?"justify-end":"justify-start"}" data-dm-msg-id="${i}" style="position:relative;">
        <div style="max-width:70%;position:relative;">
          <div class="max-w-full ${t?"bg-emerald-600 text-white":"bg-white text-zinc-900"} rounded-xl px-4 py-2 shadow">
            ${e.image_url?`<img src="${e.image_url}" style="max-width: 200px !important; max-height: 200px !important; width: auto !important; height: auto !important; object-fit: contain !important; display: block !important;" class="rounded-lg mb-2 cursor-pointer dm-msg-image" onclick="window.open('${e.image_url}', '_blank')" />`:""}
            ${e.content?`<div class="text-sm prose prose-sm ${t?"prose-invert":""} max-w-none dm-markdown">${s}</div>`:""}
            <p class="text-[10px] ${t?"text-emerald-200":"text-zinc-500"} mt-1">${this.formatTime(e.created_at)}</p>
          </div>
          <div class="dm-reactions-display" data-dm-msg-id="${i}" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;${t?"justify-content:flex-end;":""}"></div>
          <button class="dm-reaction-btn" data-dm-msg-id="${i}" style="display:none;position:absolute;${t?"left:-28px;":"right:-28px;"}bottom:4px;width:24px;height:24px;border-radius:50%;background:#27272a;border:1px solid #3f3f46;cursor:pointer;align-items:center;justify-content:center;font-size:12px;z-index:10;transition:all 0.15s;" title="React">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
          </button>
        </div>
      </div>
    `}async startDM(e){let t=await fetch(`/api/dm/start/${e}`,{method:"POST",headers:{"X-Auth-Hash":this.appState.hash||""}});if(t.ok){let s=await t.json();this.openDMChat(s.id,s.other_user.id,s.other_user.displayName)}}async viewUserProfile(e){let t=await fetch(`/api/users/${e}`,{headers:{"X-Auth-Hash":this.appState.hash||""}});if(!t.ok){alert("Could not load user profile");return}let s=await t.json(),i=e===this.appState.user?.id;this.setContent(`
      <div class="h-full w-full flex flex-col">
        <div class="panel flex-1 max-w-2xl mx-auto w-full">
          <div class="panel-header">
            <button id="profile-back-btn" class="text-zinc-400 hover:text-zinc-100 transition-colors mr-3">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <span class="panel-title">${this.escapeHtml(s.displayName||"User Profile")}</span>
          </div>
          <div class="panel-body p-6">
            <div class="flex items-start gap-6 mb-6">
              <div class="w-24 h-24 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                ${s.avatar?`<img src="${s.avatar}" class="w-full h-full object-cover"/>`:`<span class="text-emerald-400 font-bold text-3xl">${(s.displayName||"?")[0].toUpperCase()}</span>`}
              </div>
              <div class="flex-1">
                <h2 class="text-xl font-bold text-zinc-100">${this.escapeHtml(s.displayName||"Unknown")}</h2>
                <p class="text-zinc-400">${this.escapeHtml(s.field||"Explorer")}</p>
                ${s.skills?.length>0?`
                  <div class="flex flex-wrap gap-1 mt-2">
                    ${s.skills.map(a=>`<span class="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded text-xs text-emerald-400">${this.escapeHtml(a)}</span>`).join("")}
                  </div>
                `:""}
              </div>
            </div>
            
            ${s.bio?`<p class="text-zinc-300 mb-4">${this.escapeHtml(s.bio)}</p>`:""}
            
            ${i?"":`
              <div class="flex gap-2 mt-6">
                <button id="send-dm-btn" class="btn btn-primary flex-1" data-user-id="${e}">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                  Send Message
                </button>
              </div>
            `}
          </div>
        </div>
      </div>
    `),document.getElementById("profile-back-btn")?.addEventListener("click",()=>{this.currentGroupId?this.openGroup(this.currentGroupId):this.showFeed()}),document.getElementById("send-dm-btn")?.addEventListener("click",()=>this.startDM(e))}async showExplore(){this.setActiveNav("nav-explore");let[e,t]=await Promise.all([fetch("/api/hashtags/trending"),fetch("/api/ecosystems/explore",{headers:{"X-Auth-Hash":this.appState.hash||""}})]),s=e.ok?await e.json():[],i=t.ok?await t.json():[];this.setContent(`
      <div class="h-full w-full flex flex-col">
        <div class="panel flex-1">
          <div class="panel-header">
            <span class="panel-title">Explore</span>
            <span class="text-xs text-zinc-500">Ecosystems & discover</span>
          </div>
          <div class="panel-body p-4">
            <div class="relative mb-4">
              <div class="relative">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input type="text" id="explore-search" placeholder="Search users, bots, hashtags, groups..." 
                  class="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all">
              </div>
              <div id="search-results" class="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl hidden overflow-hidden max-h-96 overflow-y-auto"></div>
            </div>

            <div class="bg-zinc-800/50 rounded-lg p-4 mb-4 border border-zinc-700">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <i data-lucide="globe" class="w-4 h-4 text-emerald-400"></i>
                  Ecosystems
                </h3>
                <div class="flex items-center gap-2">
                  <input type="text" id="eco-filter" placeholder="Filter..." class="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 w-32">
                  <button id="create-eco-btn" class="btn btn-primary text-xs py-1 px-3">
                    <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    Create
                  </button>
                </div>
              </div>
              <div id="eco-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                ${i.length===0?`
                  <div class="col-span-full text-center py-6 text-zinc-500 text-sm">No ecosystems found</div>
                `:i.map(n=>{let l=this.userEcosystems.some(o=>o.id===n.id);return`
                  <div class="eco-card bg-zinc-900 border border-zinc-700 rounded-xl p-4 hover:border-zinc-600 transition-all" data-eco-id="${n.id}" data-eco-name="${this.escapeHtml(n.name).toLowerCase()}">
                    <div class="flex items-start gap-3 mb-3">
                      ${n.icon?`<img src="${n.icon}" class="w-10 h-10 rounded-lg flex-shrink-0" alt="">`:`<div class="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-lg font-bold text-white" style="background-color: ${n.accent_color||"#10b981"}">${n.name.charAt(0).toUpperCase()}</div>`}
                      <div class="flex-1 min-w-0">
                        <h4 class="text-sm font-semibold text-zinc-100 truncate">${this.escapeHtml(n.name)}</h4>
                        <p class="text-[11px] text-zinc-500">${n.member_count||0} members</p>
                      </div>
                    </div>
                    <p class="text-xs text-zinc-400 mb-3 line-clamp-2">${this.escapeHtml(n.description||"")}</p>
                    <button class="eco-join-btn w-full text-xs py-1.5 rounded-lg font-medium transition-all ${l?"bg-zinc-800 text-zinc-400 hover:bg-red-500/20 hover:text-red-400":"bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"}" data-eco-id="${n.id}" data-is-member="${l}">
                      ${l?"Joined":"Join"}
                    </button>
                  </div>`}).join("")}
              </div>
            </div>
            
            <div class="bg-zinc-800/50 rounded-lg p-4 mb-4 border border-zinc-700">
              <h3 class="text-sm font-semibold text-zinc-100 mb-3 flex items-center gap-2">
                <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
                </svg>
                Trending Hashtags
              </h3>
              <div class="flex flex-wrap gap-2">
                ${s.length===0?`
                  <p class="text-zinc-500 text-xs">No trending hashtags yet</p>
                `:s.map(n=>`
                  <button class="trending-tag text-xs" data-tag="${n.tag}">
                    <span class="text-purple-400">#${n.tag}</span>
                    <span class="text-zinc-500">${n.count}</span>
                  </button>
                `).join("")}
              </div>
            </div>
            
            <div class="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
              <h3 class="text-sm font-semibold text-zinc-100 mb-3">Quick Tips</h3>
              <div class="space-y-2 text-xs text-zinc-400">
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">@</span>
                  <span><code class="text-emerald-400">@username</code> to mention</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold">#</span>
                  <span><code class="text-purple-400">#topic</code> to tag</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold">*</span>
                  <span>Markdown supported</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `),window.lucide&&window.lucide.createIcons(),document.querySelectorAll(".trending-tag").forEach(n=>{n.addEventListener("click",()=>{let l=n.dataset.tag;l&&this.showHashtagFeed(l)})}),document.getElementById("create-eco-btn")?.addEventListener("click",()=>this.showCreateEcosystem());let a=document.getElementById("eco-filter");a&&a.addEventListener("input",()=>{let n=a.value.trim().toLowerCase();document.querySelectorAll(".eco-card").forEach(l=>{let o=l.dataset.ecoName||"";l.style.display=!n||o.includes(n)?"":"none"})}),document.querySelectorAll(".eco-join-btn").forEach(n=>{n.addEventListener("click",async l=>{l.stopPropagation();let o=n.dataset.ecoId,r=n.dataset.isMember==="true";if(!o)return;let c=r?`/api/ecosystems/${o}/leave`:`/api/ecosystems/${o}/join`,m=await fetch(c,{method:"POST",headers:{"X-Auth-Hash":this.appState.hash||""}});if(m.ok)await this.loadUserEcosystems(),this.showExplore();else{let f=await m.json().catch(()=>({detail:"Failed"}));C(f.detail||"Action failed","error")}})}),this.setupExploreSearch()}async showEcosystemExplore(){this.showExplore()}setupExploreSearch(){let e=document.getElementById("explore-search"),t=document.getElementById("search-results");if(!e||!t)return;let s=null;e.addEventListener("input",()=>{clearTimeout(s);let i=e.value.trim();if(i.length<2){t.classList.add("hidden"),t.innerHTML="";return}s=setTimeout(async()=>{let a=await fetch(`/api/search?q=${encodeURIComponent(i)}`);if(!a.ok)return;let n=await a.json();if(!(n.users.length||n.bots.length||n.hashtags.length||n.groups.length)){t.innerHTML='<div class="p-4 text-center text-zinc-500 text-sm">No results found</div>',t.classList.remove("hidden");return}let o="";n.users.length&&(o+=`<div class="px-3 py-2 bg-zinc-800/50 text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-2">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            Users
          </div>`,n.users.forEach(r=>{o+=`<button class="search-result-user w-full px-3 py-2 flex items-center gap-3 hover:bg-zinc-800 transition-colors text-left" data-id="${r.id}" data-name="${this.escapeHtml(r.displayName)}">
              ${r.avatar?`<img src="${r.avatar}" class="w-8 h-8 rounded-full object-cover border border-zinc-700">`:`<div class="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold">${r.displayName?.charAt(0)||"?"}</div>`}
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-zinc-100 truncate">${this.escapeHtml(r.displayName)}</div>
                <div class="text-xs text-zinc-500 truncate">@${this.escapeHtml(r.username)} \xB7 ${this.escapeHtml(r.field||"Member")}</div>
              </div>
            </button>`})),n.bots.length&&(o+=`<div class="px-3 py-2 bg-zinc-800/50 text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-2">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            Bots
          </div>`,n.bots.forEach(r=>{o+=`<button class="search-result-user w-full px-3 py-2 flex items-center gap-3 hover:bg-zinc-800 transition-colors text-left" data-id="${r.id}" data-name="${this.escapeHtml(r.displayName)}">
              ${r.avatar?`<img src="${r.avatar}" class="w-8 h-8 rounded-full object-cover border border-purple-500/50">`:`<div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-sm font-bold">${r.displayName?.charAt(0)||"?"}</div>`}
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-zinc-100 truncate flex items-center gap-1">${this.escapeHtml(r.displayName)} <span class="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">BOT</span></div>
                <div class="text-xs text-zinc-500 truncate">${this.escapeHtml(r.purpose||"Bot")}</div>
              </div>
            </button>`})),n.hashtags.length&&(o+=`<div class="px-3 py-2 bg-zinc-800/50 text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-2">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/></svg>
            Hashtags
          </div>`,n.hashtags.forEach(r=>{o+=`<button class="search-result-tag w-full px-3 py-2 flex items-center gap-3 hover:bg-zinc-800 transition-colors text-left" data-tag="${r.tag}">
              <div class="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-lg font-bold">#</div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-purple-400">#${this.escapeHtml(r.tag)}</div>
                <div class="text-xs text-zinc-500">${r.count} posts</div>
              </div>
            </button>`})),n.groups.length&&(o+=`<div class="px-3 py-2 bg-zinc-800/50 text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-2">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            Groups
          </div>`,n.groups.forEach(r=>{let c=r.ecosystem_name?`<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-medium border border-emerald-500/20">${this.escapeHtml(r.ecosystem_name)}</span>`:"";o+=`<button class="search-result-group w-full px-3 py-2 flex items-center gap-3 hover:bg-zinc-800 transition-colors text-left" data-id="${r.id}" data-slug="${r.slug}">
              <div class="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-sm font-bold">${r.name?.charAt(0)||"G"}</div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-zinc-100 truncate flex items-center gap-2">${this.escapeHtml(r.name)} ${c}</div>
                <div class="text-xs text-zinc-500 truncate">${this.escapeHtml(r.description||r.slug)}</div>
              </div>
            </button>`})),t.innerHTML=o,t.classList.remove("hidden"),t.querySelectorAll(".search-result-user").forEach(r=>{r.addEventListener("click",()=>{let c=r.dataset.id,m=r.dataset.name;c&&(t.classList.add("hidden"),e.value="",this.showUserProfile(m||c))})}),t.querySelectorAll(".search-result-tag").forEach(r=>{r.addEventListener("click",()=>{let c=r.dataset.tag;c&&(t.classList.add("hidden"),e.value="",this.showHashtagFeed(c))})}),t.querySelectorAll(".search-result-group").forEach(r=>{r.addEventListener("click",()=>{let c=r.dataset.id;c&&(t.classList.add("hidden"),e.value="",this.openGroup(c))})})},200)}),e.addEventListener("blur",()=>{setTimeout(()=>t.classList.add("hidden"),200)}),e.addEventListener("focus",()=>{e.value.trim().length>=2&&t.innerHTML&&t.classList.remove("hidden")})}async showHashtagFeed(e){let t=await fetch(`/api/hashtags/${e}`,{headers:{"X-Auth-Hash":this.appState.hash||""}}),s=t.ok?await t.json():{tag:e,posts:[],total:0};this.setContent(`
      <div class="max-w-2xl mx-auto px-4 py-8">
        <div class="flex items-center gap-4 mb-8">
          <button id="back-to-explore" class="text-zinc-400 hover:text-zinc-100 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 class="text-2xl font-bold gradient-text">#${this.escapeHtml(e)}</h1>
            <p class="text-sm text-zinc-500">${s.total} posts</p>
          </div>
        </div>
        
        <div id="hashtag-posts" class="space-y-4">
          ${s.posts.length===0?`
            <div class="text-center py-16 text-zinc-500">
              <p>No posts with this hashtag yet</p>
            </div>
          `:s.posts.map(i=>`
            <div class="post-card">
              <div class="flex items-start gap-4">
                ${i.author?.avatar?`
                  <img src="${i.author.avatar}" alt="${i.author.displayName}" class="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-zinc-700">
                `:`
                  <div class="avatar avatar-md flex-shrink-0">
                    <span>${i.author?.displayName?.charAt(0)||"?"}</span>
                  </div>
                `}
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="font-semibold text-zinc-100">${i.author?.displayName||"Anonymous"}</span>
                    <span class="text-zinc-600">\xB7</span>
                    <span class="text-sm text-zinc-500">${this.formatTime(i.created_at)}</span>
                  </div>
                  <div class="text-zinc-300 leading-relaxed prose prose-sm prose-invert">${ge(i.content)}</div>
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `),document.getElementById("back-to-explore")?.addEventListener("click",()=>this.showExplore())}async showUserProfile(e){let t=await fetch(`/api/users/search/${e}`),i=(t.ok?await t.json():[]).find(l=>l.displayName.toLowerCase()===e.toLowerCase()||l.username&&l.username.toLowerCase()===e.toLowerCase());if(!i){D("User not found","error");return}let a=await fetch(`/api/users/${i.id}`),n=a.ok?await a.json():null;if(!n){D("User not found","error");return}this.setContent(`
      <div class="max-w-2xl mx-auto px-4 py-8">
        <button id="back-btn" class="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 mb-6 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        
        <div class="card">
          <div class="flex items-center gap-5 mb-6">
            <div class="relative">
              ${n.avatar?`
                <img src="${n.avatar}" alt="${n.displayName}" class="w-20 h-20 rounded-full object-cover border-2 border-zinc-700">
              `:`
                <div class="avatar avatar-xl">
                  <span>${n.displayName.charAt(0).toUpperCase()}</span>
                </div>
              `}
              <div class="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-emerald-500 rounded-full blur opacity-30 -z-10"></div>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-zinc-100">${this.escapeHtml(n.displayName)}</h2>
              <p class="text-zinc-400">${this.escapeHtml(n.bio||"No bio")}</p>
            </div>
          </div>
          
          <div class="grid gap-4">
            ${n.skills?.length>0?`
              <div class="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                <h3 class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Skills</h3>
                <div class="flex flex-wrap gap-2">
                  ${n.skills.map(l=>`<span class="badge badge-skill">${this.escapeHtml(l)}</span>`).join("")}
                </div>
              </div>
            `:""}
            
            ${n.talents?.length>0?`
              <div class="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                <h3 class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Talents</h3>
                <div class="flex flex-wrap gap-2">
                  ${n.talents.map(l=>`<span class="badge badge-talent">${this.escapeHtml(l)}</span>`).join("")}
                </div>
              </div>
            `:""}
          </div>
          
          ${i.id!==this.appState.user?.id?`
            <div class="mt-6">
              <button id="profile-dm-btn" class="btn btn-primary w-full">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
                Send Message
              </button>
            </div>
          `:""}
        </div>
      </div>
    `),document.getElementById("back-btn")?.addEventListener("click",()=>this.showApp()),document.getElementById("profile-dm-btn")?.addEventListener("click",()=>this.startDM(i.id))}async handleImageSelect(e){let t=document.getElementById("upload-error"),s=document.getElementById("image-preview-container"),i=document.getElementById("image-preview");if(!["image/jpeg","image/png","image/gif","image/webp"].includes(e.type)){t&&(t.textContent="Invalid file type. Use JPEG, PNG, GIF, or WebP.",t.classList.remove("hidden"));return}if(e.size>5*1024*1024){t&&(t.textContent="File too large. Maximum 5MB.",t.classList.remove("hidden"));return}t?.classList.add("hidden");let n=new FileReader;n.onload=l=>{i&&s&&(i.src=l.target?.result,s.classList.remove("hidden"))},n.readAsDataURL(e);try{let l=new FormData;l.append("file",e);let o=await fetch("/api/upload/image",{method:"POST",headers:{"X-Auth-Hash":this.appState.hash||""},body:l});if(o.ok){let r=await o.json();this.pendingImageUrl=r.url}else{let r=await o.json();throw new Error(r.detail||"Upload failed")}}catch(l){t&&(t.textContent=l.message||"Failed to upload image",t.classList.remove("hidden")),this.clearImagePreview()}}clearImagePreview(){this.pendingImageUrl=null,document.getElementById("image-preview-container")?.classList.add("hidden"),document.getElementById("post-image-input").value="",document.getElementById("upload-error")?.classList.add("hidden")}async submitPost(){let e=document.getElementById("post-content").value.trim();if(!e&&!this.pendingImageUrl)return;let t=document.getElementById("submit-post");t.disabled=!0,t.textContent="Posting...";try{await fetch("/api/posts",{method:"POST",headers:{"Content-Type":"application/json","X-Auth-Hash":this.appState.hash||""},body:JSON.stringify({content:e,image_url:this.pendingImageUrl})}),document.getElementById("compose-area")?.classList.add("hidden"),document.getElementById("post-content").value="",this.clearImagePreview()}catch(s){console.error("Failed to post:",s)}finally{t.disabled=!1,t.textContent="Post"}}async loadFeed(){try{let e=await fetch("/api/feed",{headers:{"X-Auth-Hash":this.appState.hash||""}});e.ok&&(this.posts=await e.json(),this.renderFeed(this.posts),this.connectFeedSocket())}catch(e){console.error("Failed to load feed:",e)}}connectFeedSocket(){if(this.feedSocket&&this.feedSocket.readyState===WebSocket.OPEN)return;let e=window.location.protocol==="https:"?"wss:":"ws:",t=this.appState.hash||"",s=`${e}//${window.location.host}/ws/feed?auth=${encodeURIComponent(t)}`;this.feedSocket=new WebSocket(s),this.feedSocket.onmessage=i=>{try{let a=JSON.parse(i.data);if(a.type==="new_post"){let n={...a.post,liked:!1};this.posts.unshift(n),this.renderFeed(this.posts)}else if(a.type==="dm_message"){let n=window.dmPanelInstance;if(n&&n.currentConversation){let l=a.message;l.conv_id===n.currentConversation.id&&n.addMessageToUI(l)}this.loadNotificationCount()}else if(a.type==="dm_reaction_update"){let n=window.dmPanelInstance;n&&n.currentConversation&&n.currentConversation.id===a.conv_id&&n.addMessageToUI(a)}else if(a.type==="notification_update"){let n=document.getElementById("notification-badge");n&&a.unread_count>0&&(n.textContent=a.unread_count>99?"99+":String(a.unread_count),n.classList.remove("hidden"))}else if(a.type==="reaction_update"&&a.target_type==="post"){let n=document.querySelector(`.reactions-display[data-post-id="${a.target_id}"]`);n&&this.renderReactionBadges(n,a.reactions,"post",a.target_id)}}catch(a){console.error("Failed to parse WebSocket message:",a)}},this.feedSocket.onerror=i=>{console.error("WebSocket error:",i)},this.feedSocket.onclose=()=>{setTimeout(()=>this.connectFeedSocket(),3e3)}}renderFeedShimmers(){return`
      <div class="post-card mx-0 sm:mx-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
        <div class="flex items-start gap-3 sm:gap-4">
          <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 bg-zinc-800 shimmer-block"></div>
          <div class="flex-1 min-w-0 space-y-3">
            <div class="flex items-center gap-2">
              <div class="h-4 w-24 rounded bg-zinc-800 shimmer-block"></div>
              <div class="h-3 w-16 rounded bg-zinc-800/60 shimmer-block"></div>
            </div>
            <div class="space-y-2">
              <div class="h-3.5 w-full rounded bg-zinc-800 shimmer-block"></div>
              <div class="h-3.5 w-4/5 rounded bg-zinc-800 shimmer-block"></div>
              <div class="h-3.5 w-3/5 rounded bg-zinc-800/70 shimmer-block"></div>
            </div>
            <div class="flex items-center gap-4 pt-1">
              <div class="h-7 w-14 rounded-lg bg-zinc-800/50 shimmer-block"></div>
              <div class="h-7 w-14 rounded-lg bg-zinc-800/50 shimmer-block"></div>
              <div class="h-7 w-14 rounded-lg bg-zinc-800/50 shimmer-block"></div>
            </div>
          </div>
        </div>
      </div>`.repeat(4)}renderFeed(e){let t=document.getElementById("feed-container");if(t){if(e.length===0){t.innerHTML=`
        <div class="text-center py-12">
          <div class="inline-flex items-center justify-center w-12 h-12 bg-zinc-800 rounded-xl mb-3">
            <svg class="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
            </svg>
          </div>
          <p class="text-sm text-zinc-500">No posts yet</p>
        </div>
      `;return}t.innerHTML=e.map(s=>`
      <div class="post-card mx-0 sm:mx-0 rounded-none sm:rounded-xl border-x-0 sm:border-x" data-post-id="${s.id}">
        <div class="flex items-start gap-3 sm:gap-4">
          ${s.author?.avatar?`
            <img src="${s.author.avatar}" alt="${s.author.displayName}" class="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0 border border-zinc-700">
          `:`
            <div class="avatar avatar-md flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12">
              <span class="text-sm sm:text-base">${s.author?.displayName?.charAt(0)||"?"}</span>
            </div>
          `}
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-1 sm:gap-2 mb-1.5 sm:mb-2">
              <span class="font-semibold text-zinc-100 text-sm sm:text-base">${s.author?.displayName||"Anonymous"}</span>
              <span class="text-zinc-600 text-xs sm:text-base">\xB7</span>
              <span class="text-xs sm:text-sm text-zinc-500">${this.formatTime(s.created_at)}${s.edited_at?" (edited)":""}</span>
              ${s.author?.id===this.appState.user?.id?`
                <div class="ml-auto flex items-center gap-2">
                  ${this.isWithinEditWindow(s.created_at)?`
                    <button class="edit-post-btn text-zinc-500 hover:text-blue-400 text-xs transition-colors" data-post-id="${s.id}" data-content="${this.escapeHtml(s.content).replace(/"/g,"&quot;")}" title="Edit (${this.getRemainingTime(s.created_at,180)})">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                  `:""}
                  ${this.isWithinDeleteWindow(s.created_at)?`
                    <button class="delete-post-btn text-zinc-500 hover:text-emerald-400 text-xs transition-colors" data-post-id="${s.id}" title="Delete (${this.getRemainingTime(s.created_at,60)})">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  `:""}
                </div>
              `:""}
            </div>
            <div class="text-zinc-300 leading-relaxed text-sm sm:text-base prose prose-sm prose-invert prose-p:my-1 prose-a:text-emerald-400 prose-code:bg-zinc-800 prose-code:px-1 prose-code:rounded break-words">${ge(s.content)}</div>
            ${s.image_url?`
              <div class="mt-3 rounded-lg overflow-hidden">
                <img src="${s.image_url}" alt="Post image" class="max-w-full max-h-96 object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity" onclick="window.open('${s.image_url}', '_blank')">
              </div>
            `:""}
            <div class="reactions-display" data-post-id="${s.id}" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;min-height:0;"></div>
            <div class="flex items-center gap-4 sm:gap-6 mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-zinc-800/50">
              <button class="like-btn ${s.liked?"text-emerald-400":"text-zinc-500"} hover:text-emerald-400 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-colors active:scale-95" data-post-id="${s.id}">
                <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="${s.liked?"currentColor":"none"}" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                </svg>
                <span class="like-count">${s.likes_count||0}</span>
              </button>
              <button class="comment-toggle-btn text-zinc-500 hover:text-zinc-300 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-colors active:scale-95" data-post-id="${s.id}">
                <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
                <span class="replies-count">${s.replies_count||0}</span>
              </button>
              <button class="reaction-btn text-zinc-500 hover:text-yellow-400 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-colors active:scale-95" data-post-id="${s.id}" style="position:relative;">
                <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </button>
            </div>
            <div class="comments-section hidden mt-3 pt-3 border-t border-zinc-800/50" data-post-id="${s.id}">
              <div class="comments-list space-y-2 mb-3"></div>
              <div class="flex gap-2">
                <input type="text" class="comment-input flex-1 bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50" placeholder="Write a comment..." data-post-id="${s.id}">
                <button class="send-comment-btn px-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors text-sm" data-post-id="${s.id}">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join(""),t.querySelectorAll(".like-btn").forEach(s=>{s.addEventListener("click",i=>{let a=i.currentTarget.dataset.postId;a&&this.likePost(a)})}),t.querySelectorAll(".edit-post-btn").forEach(s=>{s.addEventListener("click",i=>{i.stopPropagation();let a=i.currentTarget,n=a.dataset.postId,l=a.dataset.content||"";n&&this.editPost(n,l)})}),t.querySelectorAll(".delete-post-btn").forEach(s=>{s.addEventListener("click",i=>{i.stopPropagation();let a=i.currentTarget.dataset.postId;a&&this.deletePost(a)})}),t.querySelectorAll(".comment-toggle-btn").forEach(s=>{s.addEventListener("click",async i=>{let a=i.currentTarget.dataset.postId;a&&await this.toggleComments(a)})}),t.querySelectorAll(".send-comment-btn").forEach(s=>{s.addEventListener("click",async i=>{let a=i.currentTarget.dataset.postId;a&&await this.sendComment(a)})}),t.querySelectorAll(".comment-input").forEach(s=>{s.addEventListener("keypress",async i=>{if(i.key==="Enter"){let a=i.currentTarget.dataset.postId;a&&await this.sendComment(a)}})}),t.querySelectorAll(".reaction-btn").forEach(s=>{s.addEventListener("click",i=>{i.stopPropagation();let a=i.currentTarget,n=a.dataset.postId;n&&this.openEmojiDrawer("post",n,a)})}),t.querySelectorAll(".reactions-display[data-post-id]").forEach(s=>{let i=s.dataset.postId;i&&this.loadReactions("post",i)})}}async likePost(e){try{let t=await fetch(`/api/posts/${e}/like`,{method:"POST",headers:{"X-Auth-Hash":this.appState.hash||""}});if(t.ok){let s=await t.json(),i=this.posts.findIndex(n=>n.id===e);i!==-1&&(this.posts[i].liked=s.liked,this.posts[i].likes_count=s.likes_count);let a=document.querySelector(`.like-btn[data-post-id="${e}"]`);if(a){let n=a.querySelector(".like-count");n&&(n.textContent=String(s.likes_count));let l=a.querySelector("svg");l&&l.setAttribute("fill",s.liked?"currentColor":"none"),s.liked?(a.classList.add("text-emerald-500"),a.classList.remove("text-warm-gray-400")):(a.classList.remove("text-emerald-500"),a.classList.add("text-warm-gray-400"))}}}catch(t){console.error("Failed to like post:",t)}}async toggleComments(e){let t=document.querySelector(`.comments-section[data-post-id="${e}"]`);if(!t)return;t.classList.contains("hidden")?(t.classList.remove("hidden"),await this.loadComments(e)):t.classList.add("hidden")}async loadComments(e){let s=document.querySelector(`.comments-section[data-post-id="${e}"]`)?.querySelector(".comments-list");if(s)try{let i=await fetch(`/api/posts/${e}/comments`,{headers:{"X-Auth-Hash":this.appState.hash||""}});if(i.ok){let a=await i.json();a.length===0?s.innerHTML='<p class="text-zinc-500 text-sm italic">No comments yet</p>':(s.innerHTML=a.map(n=>`
            <div class="flex items-start gap-2 p-2 bg-zinc-800/30 rounded-lg" data-comment-id="${n.id}">
              ${n.author?.avatar?`
                <img src="${n.author.avatar}" alt="" class="w-6 h-6 rounded-full object-cover">
              `:`
                <div class="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-300">${n.author?.displayName?.charAt(0)||"?"}</div>
              `}
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-medium text-zinc-200">${n.author?.displayName||"Anonymous"}</span>
                  <span class="text-xs text-zinc-500">${this.formatTime(n.created_at)}</span>
                  ${n.user_id===this.appState.user?.id?`
                    <button class="delete-comment-btn ml-auto text-zinc-500 hover:text-emerald-400 text-xs" data-comment-id="${n.id}">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  `:""}
                </div>
                <p class="text-sm text-zinc-300 mt-0.5">${this.escapeHtml(n.content)}</p>
              </div>
            </div>
          `).join(""),s.querySelectorAll(".delete-comment-btn").forEach(n=>{n.addEventListener("click",async l=>{let o=l.currentTarget.dataset.commentId;o&&await this.deleteComment(o,e)})}))}}catch(i){console.error("Failed to load comments:",i)}}async sendComment(e){let t=document.querySelector(`.comment-input[data-post-id="${e}"]`);if(!t)return;let s=t.value.trim();if(s)try{if((await fetch(`/api/posts/${e}/comments`,{method:"POST",headers:{"Content-Type":"application/json","X-Auth-Hash":this.appState.hash||""},body:JSON.stringify({content:s})})).ok){t.value="",await this.loadComments(e);let a=document.querySelector(`.comment-toggle-btn[data-post-id="${e}"] .replies-count`);if(a){let n=parseInt(a.textContent||"0",10);a.textContent=String(n+1)}}}catch(i){console.error("Failed to send comment:",i)}}async deleteComment(e,t){try{if((await fetch(`/api/comments/${e}`,{method:"DELETE",headers:{"X-Auth-Hash":this.appState.hash||""}})).ok){await this.loadComments(t);let i=document.querySelector(`.comment-toggle-btn[data-post-id="${t}"] .replies-count`);if(i){let a=parseInt(i.textContent||"0",10);i.textContent=String(Math.max(0,a-1))}}}catch(s){console.error("Failed to delete comment:",s)}}showProfile(){let e=this.appState.user;e&&(this.setActiveNav("nav-profile"),this.setContent(`
      <div class="h-full w-full flex flex-col">
        <div class="panel flex-1">
          <div class="panel-header">
            <div class="flex items-center gap-3">
              <span class="panel-title">Profile</span>
              <span class="text-xs text-zinc-500">@${e.displayName}</span>
            </div>
            <button id="logout-btn" class="btn btn-destructive text-xs py-1 px-2">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              Logout
            </button>
          </div>
          <div class="panel-body p-4">
            <div class="flex items-center gap-4 mb-4">
              <div class="relative group">
                <label for="avatar-upload" class="cursor-pointer block">
                  ${e.avatar?`
                    <img src="${e.avatar}" alt="${e.displayName}" class="w-14 h-14 rounded-xl object-cover border border-zinc-700 group-hover:border-emerald-500 transition-colors">
                  `:`
                    <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg group-hover:ring-2 group-hover:ring-emerald-500 transition-all">
                      ${e.displayName.charAt(0).toUpperCase()}
                    </div>
                  `}
                  <div class="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                  </div>
                </label>
                <input type="file" id="avatar-upload" accept="image/jpeg,image/png,image/gif,image/webp" class="hidden">
              </div>
              <div>
                <h2 class="text-lg font-bold text-zinc-100">${e.displayName}</h2>
                <p class="text-xs text-zinc-400">${e.bio||"No bio"}</p>
                ${e.is_admin?'<span class="badge badge-approved text-xs mt-1">Admin</span>':""}
              </div>
            </div>
            <div id="avatar-upload-status" class="hidden mb-3 p-2 rounded-lg text-xs"></div>
            
            <div class="space-y-3">
              <div class="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                <h3 class="text-xs font-semibold text-zinc-500 mb-2">Profile</h3>
                <div class="flex flex-wrap gap-1">
                  <span class="badge badge-field text-xs">${this.getFieldLabelFromUser(e)}</span>
                  <span class="badge bg-zinc-700 text-zinc-300 border-zinc-600 text-xs">${e.experience}</span>
                </div>
              </div>
              
              <div class="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                <h3 class="text-xs font-semibold text-zinc-500 mb-2">Skills</h3>
                <div class="flex flex-wrap gap-1">
                  ${e.skills.map(t=>`<span class="badge badge-skill text-xs">${t}</span>`).join("")}
                </div>
              </div>
              
              ${e.talents.length>0?`
                <div class="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                  <h3 class="text-xs font-semibold text-zinc-500 mb-2">Talents</h3>
                  <div class="flex flex-wrap gap-1">
                    ${e.talents.map(t=>`<span class="badge badge-talent text-xs">${t}</span>`).join("")}
                  </div>
                </div>
              `:""}
              
              <div class="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                <h3 class="text-xs font-semibold text-zinc-500 mb-2">Login Hash</h3>
                <div class="flex items-center gap-2">
                  <code class="flex-1 text-[10px] font-mono bg-zinc-900 rounded px-2 py-1.5 text-zinc-400 truncate border border-zinc-700" id="hash-display">${this.appState.hash}</code>
                  <button id="copy-hash-btn" class="btn btn-secondary text-xs py-1 px-2">Copy</button>
                </div>
                <p class="text-[10px] text-zinc-500 mt-2">Use this to log in on other devices</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `),document.getElementById("copy-hash-btn")?.addEventListener("click",async()=>{let t=this.appState.hash||"";await navigator.clipboard.writeText(t);let s=document.getElementById("copy-hash-btn");s.innerHTML='<svg class="w-4 h-4 mr-2 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>Copied!',setTimeout(()=>s.innerHTML='<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy',2e3)}),document.getElementById("logout-btn")?.addEventListener("click",()=>{localStorage.removeItem(he),localStorage.removeItem(Fe),location.reload()}),document.getElementById("avatar-upload")?.addEventListener("change",async t=>{let i=t.target.files?.[0];if(!i)return;let a=document.getElementById("avatar-upload-status");a.className="mb-4 p-3 rounded-lg text-sm bg-zinc-800 text-zinc-300 border border-zinc-700",a.textContent="Uploading...",a.classList.remove("hidden");try{let n=new FormData;n.append("file",i);let l=await fetch("/api/upload/image",{method:"POST",headers:{"X-Auth-Hash":this.appState.hash||""},body:n});if(!l.ok){let m=await l.json();throw new Error(m.detail||"Upload failed")}let{url:o}=await l.json(),r=await fetch("/api/users/me/avatar",{method:"PUT",headers:{"Content-Type":"application/json","X-Auth-Hash":this.appState.hash||""},body:JSON.stringify({avatar_url:o})});if(!r.ok)throw new Error("Failed to update avatar");let c=await r.json();this.appState.user=c,a.className="mb-4 p-3 rounded-lg text-sm bg-emerald-900/50 text-emerald-300 border border-emerald-700",a.textContent="Avatar updated!",setTimeout(()=>this.showProfile(),1e3)}catch(n){a.className="mb-4 p-3 rounded-lg text-sm bg-emerald-900/50 text-emerald-300 border border-emerald-700",a.textContent=n.message||"Upload failed"}}))}showAias(e){this.setActiveNav(`nav-aias-${e}`),this._currentView=`aias-${e}`,qt(this.container,e)}showDocs(e){this.setActiveNav("nav-docs");let t=[{id:"getting-started",title:"Getting Started",icon:"rocket",children:[{id:"gs-overview",title:"What is DevNetwork?"},{id:"gs-signup",title:"Creating Your Account"},{id:"gs-2fa",title:"Two-Factor Authentication"},{id:"gs-wizard",title:"Onboarding Wizard"},{id:"gs-matchmaking",title:"Matchmaking & Network Reveal"}]},{id:"feed",title:"Feed & Posts",icon:"rss",children:[{id:"feed-overview",title:"Global Feed"},{id:"feed-posting",title:"Creating Posts"},{id:"feed-markdown",title:"Markdown & Formatting"},{id:"feed-mentions",title:"@Mentions"},{id:"feed-hashtags",title:"#Hashtags"},{id:"feed-images",title:"Image Uploads"}]},{id:"communities",title:"Communities",icon:"users",children:[{id:"comm-overview",title:"Overview"},{id:"comm-joining",title:"Joining Communities"},{id:"comm-creating",title:"Creating a Community"},{id:"comm-messaging",title:"Messaging"},{id:"comm-moderation",title:"Moderation & Approval"},{id:"comm-sharing",title:"External Sharing"}]},{id:"dm",title:"Direct Messages",icon:"message-square",children:[{id:"dm-overview",title:"Overview"},{id:"dm-starting",title:"Starting a Conversation"},{id:"dm-features",title:"Features"}]},{id:"notifications",title:"Notifications",icon:"bell",children:[{id:"notif-overview",title:"Overview"},{id:"notif-types",title:"Notification Types"}]},{id:"profile",title:"Your Profile",icon:"user",children:[{id:"profile-overview",title:"Overview"},{id:"profile-editing",title:"Editing Your Profile"}]},{id:"geppetto",title:"Bot API (Geppetto)",icon:"bot",children:[{id:"gep-overview",title:"What is Geppetto?"},{id:"gep-creating",title:"Creating a Bot"},{id:"gep-commands",title:"Geppetto Commands"},{id:"gep-capabilities",title:"Capabilities"},{id:"gep-tokens",title:"Authentication & Tokens"},{id:"gep-groups",title:"Group Messaging"},{id:"gep-approval",title:"Approval System"}]},{id:"bot-api",title:"Bot REST API",icon:"code",children:[{id:"api-auth",title:"Authentication"},{id:"api-profile",title:"Bot Profile"},{id:"api-feed",title:"Feed Endpoints"},{id:"api-posts",title:"Creating Posts"},{id:"api-comments",title:"Comments"},{id:"api-groups",title:"Group Messaging"},{id:"api-dm",title:"Direct Messages"},{id:"api-audit",title:"Audit Log"}]},{id:"sdk",title:"SDK Packages",icon:"package",children:[{id:"sdk-python",title:"Python SDK"},{id:"sdk-node",title:"Node.js SDK"},{id:"sdk-websocket",title:"WebSocket Events"}]}],s=this.appState.user;s&&(s.is_admin||s.isSuperAdmin)&&t.push({id:"admin",title:"Admin Panel",icon:"shield",children:[{id:"admin-overview",title:"Overview"},{id:"admin-groups",title:"Community Approval"},{id:"admin-bots",title:"Bot Management"}]});let i={"gs-overview":`
        <h1>What is DevNetwork?</h1>
        <p>DevNetwork is a professional networking platform built for developers, designers, and builders looking to connect, collaborate, and grow. Think of it as a modern dev hub \u2014 real-time conversations and networking without the paywall.</p>
        <h3>Core Philosophy</h3>
        <ul>
          <li>Works seamlessly on mobile and desktop</li>
          <li>Automated matchmaking based on your skills and interests</li>
          <li>Real-time messaging with WebSocket support</li>
          <li>Security-first with mandatory two-factor authentication</li>
          <li>Full Markdown support across the platform</li>
        </ul>
        <h3>Key Features</h3>
        <table>
          <thead><tr><th>Feature</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td>Global Feed</td><td>Post updates, share images, use @mentions and #hashtags</td></tr>
            <tr><td>Communities</td><td>Real-time group messaging rooms organized by topic</td></tr>
            <tr><td>Direct Messages</td><td>Private 1-on-1 conversations</td></tr>
            <tr><td>Bot API</td><td>Create and deploy bots via Geppetto</td></tr>
            <tr><td>Matchmaking</td><td>Auto-join communities based on your profile</td></tr>
          </tbody>
        </table>
      `,"gs-signup":`
        <h1>Creating Your Account</h1>
        <p>Registration on DevNetwork uses a unique device fingerprint combined with a username and two-factor authentication.</p>
        <h3>Step-by-Step</h3>
        <ol>
          <li>Visit the platform \u2014 your device fingerprint is generated automatically</li>
          <li>Choose a unique display name (will be normalized to lowercase, no spaces)</li>
          <li>Set up mandatory Google Authenticator 2FA</li>
          <li>Complete the onboarding wizard to build your profile</li>
        </ol>
        <div class="doc-callout doc-callout-info">
          <strong>Username Rules</strong>
          <p>Usernames are automatically normalized: converted to lowercase, spaces removed, and trimmed. This prevents impersonation. For example, "John Doe" becomes "johndoe".</p>
        </div>
        <div class="doc-callout doc-callout-warning">
          <strong>Important</strong>
          <p>You must complete 2FA setup within 1 hour. Incomplete registrations are automatically deleted for security.</p>
        </div>
      `,"gs-2fa":`
        <h1>Two-Factor Authentication</h1>
        <p>DevNetwork requires Google TOTP (Time-based One-Time Password) for all accounts. This is mandatory and cannot be skipped.</p>
        <h3>Setup Process</h3>
        <ol>
          <li>Install <strong>Google Authenticator</strong> on your phone (iOS or Android)</li>
          <li>During registration, scan the QR code shown on screen</li>
          <li>Enter the 6-digit code from the app to verify</li>
          <li>Your 2FA is now active \u2014 you'll need a code each time you log in</li>
        </ol>
        <h3>Logging In</h3>
        <p>Each login requires your device fingerprint plus a valid 2FA code from Google Authenticator. If you lose access to your authenticator app, contact an admin for account recovery.</p>
      `,"gs-wizard":`
        <h1>Onboarding Wizard</h1>
        <p>After creating your account, the onboarding wizard collects information to build your professional profile and match you with relevant communities.</p>
        <h3>Wizard Steps</h3>
        <table>
          <thead><tr><th>Step</th><th>What You Choose</th><th>Example Options</th></tr></thead>
          <tbody>
            <tr><td>1. Field</td><td>Your primary professional area</td><td>Development, Marketing, Product, Data, DevOps</td></tr>
            <tr><td>2. Experience</td><td>Your experience level</td><td>Junior, Mid-level, Senior, Expert</td></tr>
            <tr><td>3. Skills</td><td>Your technical or professional skills</td><td>React, Python, SEO, Figma, Docker</td></tr>
            <tr><td>4. Focus</td><td>Your work orientation</td><td>Product, Technical, Growth, Design, Systems</td></tr>
            <tr><td>5. Team Preference</td><td>Your ideal team size</td><td>Solo, Small (2-5), Medium (5-15), Large (15+)</td></tr>
            <tr><td>6. Talents</td><td>Hidden talents discovered through questions</td><td>Leadership, Mentoring, Public Speaking</td></tr>
            <tr><td>7. Interests</td><td>Topics you care about</td><td>Startups, Open Source, Freelance, AI</td></tr>
          </tbody>
        </table>
      `,"gs-matchmaking":`
        <h1>Matchmaking & Network Reveal</h1>
        <p>After completing the wizard, DevNetwork's matchmaking engine automatically connects you to relevant communities.</p>
        <h3>How Matchmaking Works</h3>
        <ol>
          <li>Your wizard answers are analyzed against 70+ pre-built communities</li>
          <li>You're auto-joined to every community that matches your field, skills, interests, or talents</li>
          <li>The <strong>Network Reveal</strong> screen shows all your matched communities with animated cards</li>
        </ol>
        <div class="doc-callout doc-callout-info">
          <strong>Tip</strong>
          <p>The more detailed your wizard answers, the more communities you'll be matched with. You can always join additional communities later from the Communities page.</p>
        </div>
      `,"feed-overview":`
        <h1>Global Feed</h1>
        <p>The global feed is the main timeline \u2014 similar to X (Twitter). All posts from all users appear here in reverse chronological order.</p>
        <h3>What You'll See</h3>
        <ul>
          <li>Posts from all users across the platform</li>
          <li>Embedded images with click-to-expand</li>
          <li>Rendered Markdown formatting</li>
          <li>Clickable @mentions and #hashtags</li>
          <li>Like and comment counts</li>
          <li>Real-time updates via WebSocket (new posts appear automatically)</li>
        </ul>
      `,"feed-posting":`
        <h1>Creating Posts</h1>
        <p>Share updates, thoughts, and content with the entire DevNetwork community.</p>
        <h3>How to Post</h3>
        <ol>
          <li>Click the text area at the top of the Feed page</li>
          <li>Write your content (Markdown supported)</li>
          <li>Optionally attach an image using the camera icon</li>
          <li>Click <strong>Post</strong> to publish</li>
        </ol>
        <h3>Post Features</h3>
        <ul>
          <li><strong>Markdown</strong> \u2014 Bold, italic, code blocks, links, lists, and more</li>
          <li><strong>@Mentions</strong> \u2014 Tag other users with <code>@username</code></li>
          <li><strong>#Hashtags</strong> \u2014 Add topic tags with <code>#topic</code></li>
          <li><strong>Images</strong> \u2014 Upload images (max 10MB, JPG/PNG/GIF/WebP)</li>
        </ul>
      `,"feed-markdown":`
        <h1>Markdown & Formatting</h1>
        <p>DevNetwork supports full GitHub Flavored Markdown (GFM) across posts, comments, community messages, and direct messages.</p>
        <h3>Supported Syntax</h3>
        <table>
          <thead><tr><th>Format</th><th>Syntax</th><th>Result</th></tr></thead>
          <tbody>
            <tr><td>Bold</td><td><code>**text**</code></td><td><strong>text</strong></td></tr>
            <tr><td>Italic</td><td><code>*text*</code></td><td><em>text</em></td></tr>
            <tr><td>Code (inline)</td><td><code>\`code\`</code></td><td><code>code</code></td></tr>
            <tr><td>Code Block</td><td><code>\`\`\`lang\\ncode\\n\`\`\`</code></td><td>Syntax-highlighted block</td></tr>
            <tr><td>Link</td><td><code>[text](url)</code></td><td>Clickable link</td></tr>
            <tr><td>List</td><td><code>- item</code></td><td>Bullet list</td></tr>
            <tr><td>Numbered List</td><td><code>1. item</code></td><td>Ordered list</td></tr>
            <tr><td>Heading</td><td><code># Heading</code></td><td>Large heading</td></tr>
            <tr><td>Blockquote</td><td><code>&gt; quote</code></td><td>Indented quote</td></tr>
            <tr><td>Strikethrough</td><td><code>~~text~~</code></td><td><del>text</del></td></tr>
          </tbody>
        </table>
      `,"feed-mentions":`
        <h1>@Mentions</h1>
        <p>Tag other users in posts and messages to get their attention.</p>
        <h3>How to Mention</h3>
        <p>Type <code>@</code> followed by the username: <code>@johndoe</code></p>
        <h3>What Happens</h3>
        <ul>
          <li>The mentioned user receives a real-time notification</li>
          <li>The @mention is highlighted and clickable in the post</li>
          <li>Clicking a mention navigates to that user's profile</li>
          <li>Mentions work in posts, comments, community messages, and DMs</li>
        </ul>
      `,"feed-hashtags":`
        <h1>#Hashtags</h1>
        <p>Organize content by topic with hashtags.</p>
        <h3>How to Use</h3>
        <p>Add <code>#</code> before a word: <code>#react</code>, <code>#devlife</code>, <code>#launch</code></p>
        <h3>Discoverability</h3>
        <ul>
          <li>Hashtags are automatically extracted and indexed</li>
          <li>Click any hashtag to see all posts with that tag</li>
          <li>Trending hashtags appear on the <strong>Explore</strong> page</li>
          <li>The trending algorithm ranks tags by usage count</li>
        </ul>
      `,"feed-images":`
        <h1>Image Uploads</h1>
        <p>Share images in posts, community messages, and direct messages.</p>
        <h3>Supported Formats</h3>
        <ul>
          <li>JPEG, PNG, GIF, WebP</li>
          <li>Maximum file size: 10MB</li>
          <li>Images are hosted via ImgBB CDN</li>
        </ul>
        <h3>How to Upload</h3>
        <ol>
          <li>Click the camera/image icon in the compose area</li>
          <li>Select an image from your device</li>
          <li>A preview appears \u2014 click the X to remove it</li>
          <li>Submit your post/message to upload</li>
        </ol>
      `,"comm-overview":`
        <h1>Communities</h1>
        <p>Communities are real-time messaging rooms organized by topic \u2014 similar to Slack channels or Telegram groups. They're the heart of DevNetwork's collaboration features.</p>
        <h3>Features</h3>
        <ul>
          <li>Real-time messaging via WebSocket</li>
          <li>Full Markdown support</li>
          <li>Image sharing</li>
          <li>Member lists</li>
          <li>Owner moderation controls</li>
          <li>Bot integration support</li>
          <li>External invite links</li>
        </ul>
      `,"comm-joining":`
        <h1>Joining Communities</h1>
        <p>There are several ways to join a community:</p>
        <h3>1. Automatic Matchmaking</h3>
        <p>When you complete the onboarding wizard, you're auto-joined to communities matching your profile.</p>
        <h3>2. Browse & Join</h3>
        <p>From the Communities page, browse all available communities and click <strong>Join</strong> on any that interest you.</p>
        <h3>3. Invite Links</h3>
        <p>Communities have shareable links in the format <code>/g/{slug}</code>. Opening an invite link auto-joins you to that community.</p>
        <h3>Leaving a Community</h3>
        <p>You can leave any community at any time. However, community owners must transfer ownership before leaving.</p>
      `,"comm-creating":`
        <h1>Creating a Community</h1>
        <p>Any user can create a new community. However, new communities require admin approval before going live.</p>
        <h3>Steps</h3>
        <ol>
          <li>Go to the Communities page</li>
          <li>Click <strong>Create Community</strong></li>
          <li>Enter a name, slug (URL-friendly identifier), and description</li>
          <li>Submit \u2014 your community enters the moderation queue</li>
          <li>An admin will review and approve or reject it</li>
        </ol>
        <div class="doc-callout doc-callout-info">
          <strong>Slug Format</strong>
          <p>The slug becomes part of the shareable URL, e.g., <code>/g/react-devs</code>. Keep it short, lowercase, and use hyphens for spaces.</p>
        </div>
      `,"comm-messaging":`
        <h1>Community Messaging</h1>
        <p>Once you've joined a community, you can send and receive messages in real time.</p>
        <h3>Features</h3>
        <ul>
          <li><strong>Real-time delivery</strong> \u2014 Messages appear instantly for all members</li>
          <li><strong>Markdown</strong> \u2014 Full GFM formatting support</li>
          <li><strong>Images</strong> \u2014 Upload and share images inline</li>
          <li><strong>@Mentions</strong> \u2014 Tag specific members</li>
          <li><strong>Message history</strong> \u2014 Scroll up to load older messages (50 at a time)</li>
        </ul>
      `,"comm-moderation":`
        <h1>Moderation & Approval</h1>
        <p>Communities go through a moderation pipeline to ensure quality.</p>
        <h3>Status Flow</h3>
        <table>
          <thead><tr><th>Status</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>pending</code></td><td>Awaiting admin review \u2014 shown with "In Moderation" badge</td></tr>
            <tr><td><code>approved</code></td><td>Live and visible to all users</td></tr>
            <tr><td><code>rejected</code></td><td>Denied by admin \u2014 not visible</td></tr>
          </tbody>
        </table>
        <h3>Owner Responsibilities</h3>
        <ul>
          <li>Manage community members</li>
          <li>Approve or reject bot applications for the community</li>
          <li>Transfer ownership if needed before leaving</li>
        </ul>
      `,"comm-sharing":`
        <h1>External Sharing</h1>
        <p>Every community has a shareable URL that can be distributed outside of DevNetwork.</p>
        <h3>Share Link Format</h3>
        <p><code>https://your-domain/g/{slug}</code></p>
        <h3>What Happens</h3>
        <ul>
          <li>If the user is logged in, they auto-join and are taken to the community</li>
          <li>If not logged in, they're prompted to register first</li>
        </ul>
      `,"dm-overview":`
        <h1>Direct Messages</h1>
        <p>Private 1-on-1 conversations between users. Messages are only visible to the two participants.</p>
        <h3>Features</h3>
        <ul>
          <li>Full Markdown support</li>
          <li>Image sharing</li>
          <li>Real-time delivery via WebSocket</li>
          <li>Unread message count</li>
          <li>Notification alerts with message preview</li>
        </ul>
      `,"dm-starting":`
        <h1>Starting a Conversation</h1>
        <p>There are multiple ways to start a DM:</p>
        <ol>
          <li><strong>From a profile</strong> \u2014 Click the message icon on any user's profile</li>
          <li><strong>From the Messages page</strong> \u2014 Search for a user and start a conversation</li>
          <li><strong>From a mention</strong> \u2014 Click a user's name in the feed</li>
        </ol>
      `,"dm-features":`
        <h1>DM Features</h1>
        <h3>Formatting</h3>
        <p>DMs support full GitHub Flavored Markdown \u2014 bold, italic, code blocks, links, and more.</p>
        <h3>Images</h3>
        <p>Upload and share images directly in DM conversations.</p>
        <h3>Notifications</h3>
        <p>You receive a real-time notification for each new DM. Click the notification to jump directly to the conversation.</p>
        <h3>Bot Messages</h3>
        <p>Bots (like Geppetto) can also send you DMs. Bot messages appear with a bot badge.</p>
      `,"notif-overview":`
        <h1>Notifications</h1>
        <p>DevNetwork's notification system keeps you informed about activity that involves you.</p>
        <h3>How It Works</h3>
        <ul>
          <li>Notifications appear in real time via WebSocket</li>
          <li>The bell icon in the sidebar shows your unread count</li>
          <li>Click a notification to navigate to the relevant content</li>
          <li>Mark notifications as read individually or view all</li>
        </ul>
      `,"notif-types":`
        <h1>Notification Types</h1>
        <table>
          <thead><tr><th>Type</th><th>Trigger</th><th>Action on Click</th></tr></thead>
          <tbody>
            <tr><td>Mention</td><td>Someone @mentions you in a post or comment</td><td>Opens the post</td></tr>
            <tr><td>Comment</td><td>Someone comments on your post</td><td>Opens the post</td></tr>
            <tr><td>DM</td><td>You receive a direct message</td><td>Opens the conversation</td></tr>
            <tr><td>Community Message</td><td>New messages in your communities (batched)</td><td>Opens the community</td></tr>
            <tr><td>Bot Approved</td><td>Your bot application is approved</td><td>Shows approval details</td></tr>
          </tbody>
        </table>
        <div class="doc-callout doc-callout-info">
          <strong>Batched Notifications</strong>
          <p>Community messages are batched to avoid notification spam. Instead of one notification per message, you'll see "5 new messages in react-devs".</p>
        </div>
      `,"profile-overview":`
        <h1>Your Profile</h1>
        <p>Your profile showcases your professional identity on DevNetwork \u2014 built from your wizard answers and customizable fields.</p>
        <h3>Profile Fields</h3>
        <ul>
          <li><strong>Display Name</strong> \u2014 Your unique username</li>
          <li><strong>Avatar</strong> \u2014 Upload a profile photo</li>
          <li><strong>Bio</strong> \u2014 A short description of yourself</li>
          <li><strong>Field</strong> \u2014 Your professional area (from wizard)</li>
          <li><strong>Experience</strong> \u2014 Your level (from wizard)</li>
          <li><strong>Skills</strong> \u2014 Technical and professional skills</li>
          <li><strong>Talents</strong> \u2014 Discovered through the wizard</li>
          <li><strong>Facebook</strong> \u2014 Link to your Facebook profile</li>
        </ul>
      `,"profile-editing":`
        <h1>Editing Your Profile</h1>
        <p>Click the <strong>Edit</strong> button on your profile page to update:</p>
        <ul>
          <li>Avatar (upload a new photo)</li>
          <li>Bio text</li>
          <li>Facebook Profile URL</li>
          <li>Social links</li>
        </ul>
        <div class="doc-callout doc-callout-warning">
          <strong>Note</strong>
          <p>Your display name cannot be changed after registration to prevent impersonation.</p>
        </div>
      `,"gep-overview":`
        <h1>What is Geppetto?</h1>
        <p>Geppetto is DevNetwork's bot orchestration system. It's a system bot that helps you create, manage, and deploy bots through conversational commands in your DMs.</p>
        <h3>How It Works</h3>
        <ol>
          <li>Open a DM with <strong>Geppetto</strong> (find it in your messages or the Bots page)</li>
          <li>Use slash commands to create and manage bots</li>
          <li>Geppetto walks you through each step conversationally</li>
          <li>Your bots get API tokens and can interact with the platform programmatically</li>
        </ol>
        <div class="doc-callout doc-callout-info">
          <strong>Geppetto is automatic</strong>
          <p>Geppetto is a system bot initialized on platform startup. You don't need to create it \u2014 just DM it to get started.</p>
        </div>
      `,"gep-creating":`
        <h1>Creating a Bot</h1>
        <p>Use the <code>/newbot</code> command in your DM with Geppetto to create a new bot.</p>
        <h3>Process</h3>
        <ol>
          <li>Send <code>/newbot</code> to Geppetto</li>
          <li>Geppetto asks for a bot name</li>
          <li>Provide a description of what your bot does</li>
          <li>Select capabilities (what your bot can do)</li>
          <li>Geppetto creates the bot and provides your API token</li>
        </ol>
        <div class="doc-callout doc-callout-warning">
          <strong>Save Your Token</strong>
          <p>The API token is only shown once. Store it securely \u2014 you'll need it for all API requests. If you lose it, use <code>/token</code> to regenerate (invalidates the old one).</p>
        </div>
      `,"gep-commands":`
        <h1>Geppetto Commands</h1>
        <table>
          <thead><tr><th>Command</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>/newbot</code></td><td>Start the bot creation wizard</td></tr>
            <tr><td><code>/mybots</code></td><td>List all your bots and their status</td></tr>
            <tr><td><code>/token</code></td><td>Regenerate API token for a bot (invalidates old token)</td></tr>
            <tr><td><code>/deletebot</code></td><td>Delete one of your bots permanently</td></tr>
            <tr><td><code>/apply</code></td><td>Apply for a bot to join a community</td></tr>
          </tbody>
        </table>
        <div class="doc-callout doc-callout-info">
          <strong>Conversational Flow</strong>
          <p>Geppetto commands aren't one-shot \u2014 they start a conversation. Geppetto will ask follow-up questions and guide you through each step.</p>
        </div>
      `,"gep-capabilities":`
        <h1>Bot Capabilities</h1>
        <p>Bots operate with a capability-based permission system. Each capability grants access to specific API endpoints.</p>
        <table>
          <thead><tr><th>Capability</th><th>Allows</th></tr></thead>
          <tbody>
            <tr><td><code>post</code></td><td>Create posts on the global feed</td></tr>
            <tr><td><code>comment</code></td><td>Comment on existing posts</td></tr>
            <tr><td><code>group_message</code></td><td>Send messages in approved communities</td></tr>
            <tr><td><code>send_dm</code></td><td>Send direct messages to users (respects opt-out)</td></tr>
            <tr><td><code>react</code></td><td>React to posts and messages</td></tr>
          </tbody>
        </table>
        <div class="doc-callout doc-callout-warning">
          <strong>Scope Enforcement</strong>
          <p>API requests outside a bot's granted capabilities will be rejected with a <code>403 Forbidden</code> response.</p>
        </div>
      `,"gep-tokens":`
        <h1>Authentication & Tokens</h1>
        <p>Bots authenticate using bearer tokens in the format <code>dvn_bot_*</code>.</p>
        <h3>Token Format</h3>
        <p>Tokens are prefixed with <code>dvn_bot_</code> followed by a random string. They are SHA-256 hashed before storage \u2014 DevNetwork never stores raw tokens.</p>
        <h3>Using Your Token</h3>
        <p>Include the token in the <code>Authorization</code> header:</p>
        <pre><code>Authorization: Bearer dvn_bot_abc123xyz...</code></pre>
        <h3>Regenerating Tokens</h3>
        <p>Use <code>/token</code> in your DM with Geppetto. This immediately invalidates the old token and issues a new one.</p>
      `,"gep-groups":`
        <h1>Bot Group Messaging</h1>
        <p>Bots can send messages to communities, but they need per-community approval from the community owner.</p>
        <h3>Process</h3>
        <ol>
          <li>Your bot must have the <code>group_message</code> capability</li>
          <li>Use <code>/apply</code> in Geppetto or call the API to apply to a community</li>
          <li>The community owner reviews and approves/rejects the application</li>
          <li>Once approved, your bot can send messages to that community</li>
        </ol>
      `,"gep-approval":`
        <h1>Approval System</h1>
        <p>DevNetwork uses a two-tier approval system for bots:</p>
        <h3>Tier 1: Global Approval</h3>
        <p>When you create a bot via Geppetto, it is auto-approved globally with the requested capabilities. There's no waiting period for basic bot creation.</p>
        <h3>Tier 2: Community Approval</h3>
        <p>For community messaging, each community owner must individually approve bots. This gives community owners full control over which bots can participate.</p>
        <h3>Community Owner Actions</h3>
        <table>
          <thead><tr><th>Action</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td>View Applications</td><td>See pending bot applications for your community</td></tr>
            <tr><td>Approve</td><td>Allow the bot to send messages</td></tr>
            <tr><td>Reject</td><td>Deny the application</td></tr>
            <tr><td>Remove</td><td>Revoke a previously approved bot</td></tr>
          </tbody>
        </table>
      `,"api-auth":`
        <h1>API Authentication</h1>
        <p>All Bot API endpoints require a bearer token in the <code>Authorization</code> header.</p>
        <pre><code>curl -H "Authorization: Bearer dvn_bot_your_token_here" \\
  https://your-domain/api/bots/me</code></pre>
        <div class="doc-callout doc-callout-warning">
          <strong>Token Security</strong>
          <p>Never share your bot token publicly. If compromised, use <code>/token</code> in Geppetto to regenerate immediately.</p>
        </div>
      `,"api-profile":`
        <h1>Bot Profile</h1>
        <h3>GET /api/bots/me</h3>
        <p>Retrieve your bot's profile information.</p>
        <pre><code>curl -H "Authorization: Bearer dvn_bot_xxx" \\
  https://your-domain/api/bots/me</code></pre>
        <h3>Response</h3>
        <pre><code>{
  "id": "bot-uuid",
  "displayName": "my-bot",
  "description": "A helpful bot",
  "capabilities": ["post", "comment"],
  "owner_id": "user-uuid",
  "created_at": "2026-02-05T12:00:00Z"
}</code></pre>
      `,"api-feed":`
        <h1>Feed Endpoints</h1>
        <h3>GET /api/bots/feed</h3>
        <p>Read the global feed. No special capability required.</p>
        <pre><code>curl -H "Authorization: Bearer dvn_bot_xxx" \\
  https://your-domain/api/bots/feed</code></pre>
        <h3>Response</h3>
        <pre><code>[
  {
    "id": "post-uuid",
    "content": "Hello world!",
    "author": { "id": "uuid", "displayName": "johndoe" },
    "created_at": "2026-02-05T12:00:00Z",
    "likes_count": 5
  }
]</code></pre>
      `,"api-posts":`
        <h1>Creating Posts</h1>
        <p>Requires the <code>post</code> capability.</p>
        <h3>POST /api/bots/posts</h3>
        <pre><code>curl -X POST \\
  -H "Authorization: Bearer dvn_bot_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Hello from my bot! #automated"}' \\
  https://your-domain/api/bots/posts</code></pre>
        <h3>Request Body</h3>
        <table>
          <thead><tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>content</code></td><td>string</td><td>Yes</td><td>Post content (Markdown, @mentions, #hashtags supported)</td></tr>
            <tr><td><code>image_url</code></td><td>string</td><td>No</td><td>ImgBB URL for image attachment</td></tr>
          </tbody>
        </table>
      `,"api-comments":`
        <h1>Comments</h1>
        <p>Requires the <code>comment</code> capability.</p>
        <h3>POST /api/bots/posts/{post_id}/comments</h3>
        <pre><code>curl -X POST \\
  -H "Authorization: Bearer dvn_bot_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Great post!"}' \\
  https://your-domain/api/bots/posts/POST_ID/comments</code></pre>
      `,"api-groups":`
        <h1>Community Messaging (Bot API)</h1>
        <p>Requires the <code>group_message</code> capability plus community-level approval.</p>
        <h3>GET /api/bots/groups</h3>
        <p>List communities the bot belongs to.</p>
        <h3>POST /api/bots/groups/{id}/apply</h3>
        <p>Apply to join a community. The community owner will be notified.</p>
        <h3>POST /api/bots/groups/{id}/messages</h3>
        <p>Send a message to an approved community.</p>
        <pre><code>curl -X POST \\
  -H "Authorization: Bearer dvn_bot_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Automated update: build passed!"}' \\
  https://your-domain/api/bots/groups/GROUP_ID/messages</code></pre>
        <div class="doc-callout doc-callout-warning">
          <strong>Approval Required</strong>
          <p>Sending messages to a community before approval returns <code>403 Forbidden</code>.</p>
        </div>
      `,"api-dm":`
        <h1>Bot Direct Messages</h1>
        <p>Requires the <code>send_dm</code> capability.</p>
        <h3>POST /api/bots/dm/{user_id}</h3>
        <p>Send a DM to a user.</p>
        <pre><code>curl -X POST \\
  -H "Authorization: Bearer dvn_bot_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Hello! I have an update for you."}' \\
  https://your-domain/api/bots/dm/USER_ID</code></pre>
        <div class="doc-callout doc-callout-info">
          <strong>User Opt-Out</strong>
          <p>Users can opt out of receiving bot DMs. If a user has opted out, the API returns <code>403</code>.</p>
        </div>
      `,"api-audit":`
        <h1>Audit Log</h1>
        <p>Every bot action is recorded in an immutable audit log.</p>
        <h3>GET /api/bots/audit</h3>
        <p>Retrieve your bot's audit trail.</p>
        <pre><code>curl -H "Authorization: Bearer dvn_bot_xxx" \\
  https://your-domain/api/bots/audit</code></pre>
        <h3>Logged Actions</h3>
        <ul>
          <li>Post creation</li>
          <li>Comments</li>
          <li>Community messages</li>
          <li>DMs sent</li>
          <li>Community applications</li>
          <li>Token regeneration</li>
        </ul>
      `,"sdk-python":`
        <h1>Python SDK</h1>
        <p>Official Python client for the DevNetwork Bot API.</p>
        <h3>Installation</h3>
        <pre><code>pip install devnetwork-bot</code></pre>
        <h3>Quick Start</h3>
        <pre><code>from devnetwork import DevNetworkBot

bot = DevNetworkBot(
    token="dvn_bot_your_token",
    base_url="https://your-domain"
)

# Get bot profile
profile = bot.me()
print(f"Bot: {profile['displayName']}")

# Create a post
bot.create_post("Hello from Python! #automated")

# Read the feed
feed = bot.get_feed()
for post in feed:
    print(f"{post['author']['displayName']}: {post['content']}")

# Send a DM
bot.send_dm(user_id="uuid", content="Hey there!")

# Comment on a post
bot.create_comment(post_id="uuid", content="Nice!")

# Send community message
bot.send_group_message(group_id="uuid", content="Update!")</code></pre>
        <h3>WebSocket (Real-time)</h3>
        <pre><code>import asyncio
from devnetwork import DevNetworkBot

bot = DevNetworkBot(token="dvn_bot_xxx", base_url="https://your-domain")

async def on_message(data):
    print(f"New event: {data}")

asyncio.run(bot.connect_ws(on_message))</code></pre>
      `,"sdk-node":`
        <h1>Node.js SDK</h1>
        <p>Official Node.js/TypeScript client for the DevNetwork Bot API.</p>
        <h3>Installation</h3>
        <pre><code>npm install devnetwork-bot</code></pre>
        <h3>Quick Start</h3>
        <pre><code>import { DevNetworkBot } from 'devnetwork-bot';

const bot = new DevNetworkBot({
  token: 'dvn_bot_your_token',
  baseUrl: 'https://your-domain'
});

// Get bot profile
const profile = await bot.me();
console.log(\`Bot: \${profile.displayName}\`);

// Create a post
await bot.createPost('Hello from Node.js! #automated');

// Read the feed
const feed = await bot.getFeed();
feed.forEach(post =>
  console.log(\`\${post.author.displayName}: \${post.content}\`)
);

// Send a DM
await bot.sendDM('user-uuid', 'Hey there!');

// Send community message
await bot.sendGroupMessage('group-uuid', 'Build passed!');</code></pre>
        <h3>WebSocket (Real-time)</h3>
        <pre><code>bot.connectWebSocket((data) => {
  console.log('New event:', data);
});</code></pre>
      `,"sdk-websocket":`
        <h1>WebSocket Events</h1>
        <p>DevNetwork supports real-time communication via WebSocket connections.</p>
        <h3>Endpoints</h3>
        <table>
          <thead><tr><th>Endpoint</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>ws://host/ws/feed</code></td><td>Real-time feed updates (new posts)</td></tr>
            <tr><td><code>ws://host/ws/group/{group_id}</code></td><td>Real-time community messages</td></tr>
          </tbody>
        </table>
        <h3>Event Types</h3>
        <table>
          <thead><tr><th>Event</th><th>Payload</th></tr></thead>
          <tbody>
            <tr><td><code>new_post</code></td><td>Full post object with author info</td></tr>
            <tr><td><code>new_message</code></td><td>Full message object with sender info</td></tr>
          </tbody>
        </table>
        <h3>Example (JavaScript)</h3>
        <pre><code>const ws = new WebSocket('wss://your-domain/ws/feed');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'new_post') {
    console.log('New post:', data.post.content);
  }
};</code></pre>
      `,"admin-overview":`
        <h1>Admin Panel</h1>
        <p>The admin panel is available to users with admin or super admin privileges. Access it via the shield icon in the sidebar.</p>
        <h3>Dashboard Stats</h3>
        <ul>
          <li>Total users</li>
          <li>Total posts</li>
          <li>Total communities</li>
          <li>Pending community approvals</li>
          <li>Pending bot applications</li>
        </ul>
        <h3>Becoming an Admin</h3>
        <p>A super admin can promote users to admin status. The first super admin is created via the command-line script:</p>
        <pre><code>python scripts/create_superadmin.py &lt;username&gt;</code></pre>
      `,"admin-groups":`
        <h1>Community Approval (Admin)</h1>
        <p>Admins review and manage community creation requests.</p>
        <h3>Approval Queue</h3>
        <ul>
          <li>View all pending community requests</li>
          <li>See the community name, description, and creator</li>
          <li>Approve to make it live, or reject to deny</li>
        </ul>
        <h3>Endpoints</h3>
        <table>
          <thead><tr><th>Method</th><th>Endpoint</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td>GET</td><td><code>/api/admin/groups/pending</code></td><td>List pending communities</td></tr>
            <tr><td>POST</td><td><code>/api/admin/groups/{id}/approve</code></td><td>Approve a community</td></tr>
            <tr><td>POST</td><td><code>/api/admin/groups/{id}/reject</code></td><td>Reject a community</td></tr>
          </tbody>
        </table>
      `,"admin-bots":`
        <h1>Bot Management (Admin)</h1>
        <p>Admins can manage all bots on the platform.</p>
        <h3>Admin Bot Actions</h3>
        <table>
          <thead><tr><th>Action</th><th>Endpoint</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td>List All Bots</td><td><code>GET /api/admin/bots</code></td><td>See all registered bots</td></tr>
            <tr><td>Pending Applications</td><td><code>GET /api/admin/bots/applications</code></td><td>Review pending bot applications</td></tr>
            <tr><td>Approve</td><td><code>POST /api/admin/bots/{id}/approve</code></td><td>Approve with capabilities</td></tr>
            <tr><td>Reject</td><td><code>POST /api/admin/bots/{id}/reject</code></td><td>Reject application</td></tr>
            <tr><td>Revoke</td><td><code>POST /api/admin/bots/{id}/revoke</code></td><td>Revoke capabilities</td></tr>
          </tbody>
        </table>
      `},a=e||"gs-overview";this.setContent(`
      <div class="h-full w-full flex flex-col md:flex-row bg-zinc-950" style="max-height:100%;overflow:hidden;">
        <div class="hidden md:flex w-72 flex-shrink-0 border-r border-zinc-800 flex-col bg-zinc-900/50" style="overflow:hidden;">
          <div class="p-4 border-b border-zinc-800">
            <div class="flex items-center gap-2 mb-3">
              <i data-lucide="book-open" class="w-5 h-5 text-emerald-400"></i>
              <span class="text-sm font-bold text-zinc-100">Documentation</span>
            </div>
            <div class="relative">
              <i data-lucide="search" class="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"></i>
              <input type="text" id="docs-search" placeholder="Search docs..." class="input text-xs py-1.5 pl-8 pr-3 w-full" />
            </div>
          </div>
          <div class="flex-1 overflow-y-auto custom-scrollbar py-2" id="docs-sidebar-nav">
            ${t.map(o=>`
              <div class="docs-section-group" data-section-id="${o.id}">
                <button class="docs-section-toggle w-full text-left px-4 py-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors">
                  <i data-lucide="${o.icon}" class="w-3.5 h-3.5"></i>
                  <span class="flex-1">${o.title}</span>
                  <i data-lucide="chevron-right" class="w-3 h-3 docs-chevron transition-transform ${o.children?.some(r=>r.id===a)?"rotate-90":""}"></i>
                </button>
                <div class="docs-section-children ${o.children?.some(r=>r.id===a)?"":"hidden"}">
                  ${(o.children||[]).map(r=>`
                    <button class="docs-nav-item w-full text-left px-4 pl-10 py-1.5 text-sm transition-colors ${r.id===a?"text-emerald-400 bg-emerald-500/10 border-r-2 border-emerald-500":"text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"}" data-doc-id="${r.id}">
                      ${r.title}
                    </button>
                  `).join("")}
                </div>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="md:hidden border-b border-zinc-800 bg-zinc-900 p-3">
          <div class="flex items-center gap-2 mb-2">
            <i data-lucide="book-open" class="w-4 h-4 text-emerald-400"></i>
            <span class="text-sm font-bold text-zinc-100">Docs</span>
          </div>
          <select id="docs-mobile-nav" class="input w-full text-sm py-2">
            ${t.map(o=>`
              <optgroup label="${o.title}">
                ${(o.children||[]).map(r=>`
                  <option value="${r.id}" ${r.id===a?"selected":""}>${r.title}</option>
                `).join("")}
              </optgroup>
            `).join("")}
          </select>
        </div>

        <div class="flex-1 overflow-y-auto custom-scrollbar" id="docs-content-area">
          <div class="max-w-3xl mx-auto p-6 md:p-10">
            <div id="docs-content" class="docs-content">
              ${i[a]||'<p class="text-zinc-400">Select a section from the sidebar.</p>'}
            </div>
          </div>
        </div>
      </div>
    `),window.lucide&&window.lucide.createIcons(),document.querySelectorAll(".docs-section-toggle").forEach(o=>{o.addEventListener("click",()=>{let c=o.closest(".docs-section-group")?.querySelector(".docs-section-children"),m=o.querySelector(".docs-chevron");c&&(c.classList.toggle("hidden"),m?.classList.toggle("rotate-90"))})}),document.querySelectorAll(".docs-nav-item").forEach(o=>{o.addEventListener("click",()=>{let r=o.dataset.docId;r&&i[r]&&this.renderDocSection(r,i,t)})});let n=document.getElementById("docs-mobile-nav");n?.addEventListener("change",()=>{let o=n.value;o&&i[o]&&this.renderDocSection(o,i,t)});let l=document.getElementById("docs-search");l?.addEventListener("input",()=>{let o=l.value.toLowerCase().trim();document.querySelectorAll(".docs-section-group").forEach(r=>{let c=r.querySelectorAll(".docs-nav-item"),m=!1;c.forEach(u=>{let h=u.textContent?.toLowerCase()||"",v=!o||h.includes(o);u.style.display=v?"":"none",v&&(m=!0)});let f=r.querySelector(".docs-section-children"),b=r.querySelector(".docs-chevron");o&&m&&(f?.classList.remove("hidden"),b?.classList.add("rotate-90")),r.style.display=m||!o?"":"none"})})}renderDocSection(e,t,s){let i=document.getElementById("docs-content");i&&t[e]&&(i.innerHTML=t[e],document.getElementById("docs-content-area")?.scrollTo(0,0)),document.querySelectorAll(".docs-nav-item").forEach(n=>{n.dataset.docId===e?(n.classList.add("text-emerald-400","bg-emerald-500/10","border-r-2","border-emerald-500"),n.classList.remove("text-zinc-400","hover:text-zinc-200","hover:bg-zinc-800/50")):(n.classList.remove("text-emerald-400","bg-emerald-500/10","border-r-2","border-emerald-500"),n.classList.add("text-zinc-400","hover:text-zinc-200","hover:bg-zinc-800/50"))});for(let n of s)if(n.children?.some(l=>l.id===e)){let l=document.querySelector(`[data-section-id="${n.id}"]`),o=l?.querySelector(".docs-section-children"),r=l?.querySelector(".docs-chevron");o?.classList.remove("hidden"),r?.classList.add("rotate-90")}let a=document.getElementById("docs-mobile-nav");a&&(a.value=e)}async showGeppetto(){if(this.setActiveNav("nav-geppetto"),!this.appState.user){this.showApp();return}let t=await fetch("/api/my-bots",{headers:{"X-Auth-Hash":this.appState.hash||""}}),s=t.ok?await t.json():[];this.setContent(`
      <div class="h-full w-full flex flex-col">
        <div class="panel flex-1">
          <div class="panel-header">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <span class="panel-title">Geppetto Bot Console</span>
            </div>
          </div>
          <div class="panel-body space-y-6">
            <!-- Chat with Geppetto -->
            <div class="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                    <span class="text-white font-bold text-sm">G</span>
                  </div>
                  <div>
                    <p class="text-zinc-100 font-medium">Geppetto</p>
                    <p class="text-zinc-500 text-xs">Bot Management Assistant</p>
                  </div>
                </div>
                <button id="open-geppetto-dm" class="btn btn-primary text-sm">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                  Chat with Geppetto
                </button>
              </div>
              <p class="text-zinc-400 text-sm">Create and manage bots through conversational commands. Say hi to get started!</p>
            </div>

            <!-- Quick Commands -->
            <div>
              <h3 class="text-zinc-300 font-medium mb-3">Quick Commands</h3>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button class="geppetto-cmd bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg p-3 text-left transition-colors" data-cmd="/newbot">
                  <p class="text-zinc-100 font-medium text-sm">/newbot</p>
                  <p class="text-zinc-500 text-xs mt-1">Create a new bot</p>
                </button>
                <button class="geppetto-cmd bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg p-3 text-left transition-colors" data-cmd="/mybots">
                  <p class="text-zinc-100 font-medium text-sm">/mybots</p>
                  <p class="text-zinc-500 text-xs mt-1">List your bots</p>
                </button>
                <button class="geppetto-cmd bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg p-3 text-left transition-colors" data-cmd="/help">
                  <p class="text-zinc-100 font-medium text-sm">/help</p>
                  <p class="text-zinc-500 text-xs mt-1">Show all commands</p>
                </button>
                <button class="geppetto-cmd bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg p-3 text-left transition-colors" data-cmd="/token">
                  <p class="text-zinc-100 font-medium text-sm">/token</p>
                  <p class="text-zinc-500 text-xs mt-1">Regenerate API token</p>
                </button>
              </div>
            </div>

            <!-- My Bots -->
            <div>
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-zinc-300 font-medium">Your Bots</h3>
                <span class="text-zinc-500 text-sm">${s.length} bot${s.length!==1?"s":""}</span>
              </div>
              ${s.length===0?`
                <div class="bg-zinc-800/30 rounded-xl p-8 text-center border border-zinc-700/50">
                  <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-800 flex items-center justify-center">
                    <svg class="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <p class="text-zinc-400 text-sm mb-3">No bots yet</p>
                  <button id="create-first-bot" class="btn btn-primary text-sm">Create your first bot</button>
                </div>
              `:`
                <div class="space-y-2">
                  ${s.map(i=>`
                    <div class="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                          <span class="text-white font-bold text-sm">${(i.displayName||"B").charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p class="text-zinc-100 font-medium">${this.escapeHtml(i.displayName)}</p>
                          <div class="flex items-center gap-2 mt-1">
                            <span class="text-zinc-500 text-xs">@${this.escapeHtml(i.username||i.displayName?.toLowerCase())}</span>
                            <span class="px-1.5 py-0.5 rounded text-[10px] ${i.bot_data?.status==="approved"?"bg-emerald-500/20 text-emerald-400":i.bot_data?.status==="active"?"bg-blue-500/20 text-blue-400":"bg-amber-500/20 text-amber-400"}">${i.bot_data?.status||"pending"}</span>
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        ${i.bot_data?.capabilities_granted_global?.length>0?`
                          <div class="flex gap-1">
                            ${i.bot_data.capabilities_granted_global.slice(0,3).map(a=>`
                              <span class="px-1.5 py-0.5 bg-zinc-700 text-zinc-300 rounded text-[10px]">${a}</span>
                            `).join("")}
                          </div>
                        `:""}
                        <span class="text-zinc-500 text-xs">...${i.bot_data?.api_token_suffix||"????"}</span>
                      </div>
                    </div>
                  `).join("")}
                </div>
              `}
            </div>

            <!-- API Documentation -->
            <div class="bg-zinc-800/30 rounded-xl p-4 border border-zinc-700/50">
              <h3 class="text-zinc-300 font-medium mb-3">Bot API Endpoints</h3>
              <div class="font-mono text-xs space-y-2 text-zinc-400">
                <p><span class="text-emerald-400">GET</span> /api/bots/me - Bot profile</p>
                <p><span class="text-emerald-400">GET</span> /api/bots/feed - Read global feed</p>
                <p><span class="text-cyan-400">POST</span> /api/bots/posts - Create post</p>
                <p><span class="text-cyan-400">POST</span> /api/bots/posts/:id/comments - Comment</p>
                <p><span class="text-cyan-400">POST</span> /api/bots/dm/:user_id - Send DM</p>
                <p><span class="text-emerald-400">GET</span> /api/bots/audit - Audit log</p>
              </div>
              <p class="text-zinc-500 text-xs mt-3">Authenticate with: <code class="text-zinc-300">Authorization: Bearer YOUR_TOKEN</code></p>
            </div>
          </div>
        </div>
      </div>
    `),document.getElementById("open-geppetto-dm")?.addEventListener("click",()=>this.openGeppettoDM()),document.getElementById("create-first-bot")?.addEventListener("click",()=>this.openGeppettoDM("/newbot")),document.querySelectorAll(".geppetto-cmd").forEach(i=>{i.addEventListener("click",()=>{let a=i.dataset.cmd;a&&this.openGeppettoDM(a)})})}async openGeppettoDM(e){let t="geppetto-system-bot",s=await fetch(`/api/dm/start/${t}`,{method:"POST",headers:{"X-Auth-Hash":this.appState.hash||""}});if(s.ok){let a=(await s.json()).id;this.appState.currentDMConversation=a,e&&await fetch(`/api/dm/${a}/messages`,{method:"POST",headers:{"X-Auth-Hash":this.appState.hash||"","Content-Type":"application/json"},body:JSON.stringify({content:e})}),this.openDMChat(a,t,"Geppetto")}}async showAdmin(){this.setActiveNav("nav-admin");let e=this.appState.user,t=this.activeEcosystem&&this.userEcosystems.find(g=>g.id===this.activeEcosystem?.id&&g.user_role==="admin");if(!e?.is_admin&&!e?.is_superadmin&&!t){this.showApp();return}let s=this.activeEcosystem?.id||this.defaultEcosystemId,i=this.activeEcosystem?.name?.toUpperCase()||"DEVNET",a={"X-Auth-Hash":this.appState.hash||""},[n,l,o,r,c,m,f]=await Promise.all([fetch(`/api/admin/stats?ecosystem_id=${s}`,{headers:a}),fetch(`/api/admin/groups/pending?ecosystem_id=${s}`,{headers:a}),fetch(`/api/admin/activity/summary?ecosystem_id=${s}`,{headers:a}),fetch(`/api/admin/users?ecosystem_id=${s}`,{headers:a}),fetch(`/api/admin/bots/applications?ecosystem_id=${s}`,{headers:a}),fetch(`/api/admin/bots?ecosystem_id=${s}`,{headers:a}),fetch(`/api/ecosystems/${s}`,{headers:a})]),b=n.ok?await n.json():{users:0,posts:0,groups:0,pending_groups:0},u=l.ok?await l.json():[],h=o.ok?await o.json():{total_events:0,action_counts:{},recent:[]},v=r.ok?await r.json():[],y=c.ok?await c.json():[],w=m.ok?await m.json():[],k=f.ok?await f.json():{},S=b.admin_role==="super_admin",L=new Date,ae=Math.floor(Math.random()*99999)+1e4;this.setContent(`
      <div class="h-full w-full flex flex-col bg-black overflow-hidden font-mono">
        <!-- Terminal Header -->
        <div class="bg-black border-b border-emerald-500/30 px-4 py-2 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <span class="text-emerald-500 text-lg font-bold tracking-wider animate-pulse">\u25B6 ${i} COMMAND CENTER</span>
            <span class="text-emerald-400/60 text-xs">v2.2.2</span>
            <span class="${S?"text-amber-400 bg-amber-500/20 px-2 py-0.5":"text-cyan-400 bg-cyan-500/20 px-2 py-0.5"} text-[10px] uppercase tracking-wider">${S?"PLATFORM ADMIN":"ECO ADMIN"}</span>
          </div>
          <div class="flex items-center gap-6 text-xs">
            <span class="text-emerald-400/80">SYS_UPTIME: <span class="text-emerald-300">${ae}s</span></span>
            <span class="text-emerald-400/80">ADMIN: <span class="text-emerald-300">@${e?.displayName}</span></span>
            <span class="text-amber-400 animate-pulse">${u.length>0?"\u26A0 "+u.length+" PENDING":"\u25CF NOMINAL"}</span>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          <!-- Stats Grid - Bloomberg Style -->
          <div class="grid grid-cols-4 gap-3">
            <div class="bg-black border border-emerald-500/40 p-4 relative overflow-hidden group hover:border-emerald-400 transition-colors">
              <div class="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent"></div>
              <div class="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl"></div>
              <p class="text-emerald-500/60 text-[10px] uppercase tracking-widest mb-1">${S?"USERS.TOTAL":"ECO.MEMBERS"}</p>
              <p class="text-4xl font-bold text-emerald-400 tabular-nums">${String(b.users).padStart(4,"0")}</p>
              <div class="flex items-center gap-1 mt-2">
                <span class="text-emerald-400/60 text-xs">${S?"\u25CF registered":"\u25CF in ecosystem"}</span>
              </div>
            </div>
            <div class="bg-black border border-cyan-500/40 p-4 relative overflow-hidden group hover:border-cyan-400 transition-colors">
              <div class="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent"></div>
              <div class="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-full blur-2xl"></div>
              <p class="text-cyan-500/60 text-[10px] uppercase tracking-widest mb-1">POSTS.FEED</p>
              <p class="text-4xl font-bold text-cyan-400 tabular-nums">${String(b.posts).padStart(4,"0")}</p>
              <div class="flex items-center gap-1 mt-2">
                <span class="text-cyan-500 text-xs">\u25B2</span>
                <span class="text-cyan-400/60 text-xs">${h.action_counts?.post_create||0} new</span>
              </div>
            </div>
            <div class="bg-black border border-purple-500/40 p-4 relative overflow-hidden group hover:border-purple-400 transition-colors">
              <div class="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
              <div class="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl"></div>
              <p class="text-purple-500/60 text-[10px] uppercase tracking-widest mb-1">GROUPS.ACTIVE</p>
              <p class="text-4xl font-bold text-purple-400 tabular-nums">${String(b.groups).padStart(4,"0")}</p>
              <div class="flex items-center gap-1 mt-2">
                <span class="text-purple-400/60 text-xs">\u25CF online</span>
              </div>
            </div>
            <div class="bg-black border ${u.length>0?"border-amber-500/60 animate-pulse":"border-zinc-700"} p-4 relative overflow-hidden">
              <div class="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent"></div>
              <p class="text-amber-500/60 text-[10px] uppercase tracking-widest mb-1">QUEUE.PENDING</p>
              <p class="text-4xl font-bold ${u.length>0?"text-amber-400":"text-zinc-600"} tabular-nums">${String(b.pending_groups).padStart(4,"0")}</p>
              <div class="flex items-center gap-1 mt-2">
                <span class="${u.length>0?"text-amber-400":"text-zinc-600"} text-xs">${u.length>0?"\u26A0 REVIEW":"\u2713 CLEAR"}</span>
              </div>
            </div>
          </div>

          <!-- Secondary Stats Row -->
          <div class="grid grid-cols-4 gap-3">
            <div class="bg-black border border-emerald-500/20 p-3">
              <p class="text-emerald-500/50 text-[10px] uppercase tracking-widest">TODAY.EVENTS</p>
              <p class="text-2xl font-bold text-emerald-400 tabular-nums">${h.today_events||0}</p>
            </div>
            <div class="bg-black border border-cyan-500/20 p-3">
              <p class="text-cyan-500/50 text-[10px] uppercase tracking-widest">PEAK.HOUR</p>
              <p class="text-2xl font-bold text-cyan-400 tabular-nums">${h.peak_hour&&h.peak_hour!=="N/A"?h.peak_hour+":00":"\u2014"}</p>
            </div>
            <div class="bg-black border border-purple-500/20 p-3">
              <p class="text-purple-500/50 text-[10px] uppercase tracking-widest">ACTIVE.USERS</p>
              <p class="text-2xl font-bold text-purple-400 tabular-nums">${h.top_users?.length||0}</p>
            </div>
            <div class="bg-black border border-amber-500/20 p-3">
              <p class="text-amber-500/50 text-[10px] uppercase tracking-widest">ACTIONS.LOGGED</p>
              <p class="text-2xl font-bold text-amber-400 tabular-nums">${Object.keys(h.action_counts||{}).length}</p>
            </div>
          </div>

          <!-- Main Grid -->
          <div class="grid grid-cols-3 gap-4">
            <!-- Activity Feed - Terminal Style -->
            <div class="col-span-2 bg-black border border-emerald-500/30 overflow-hidden">
              <div class="bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-2 flex items-center justify-between">
                <span class="text-emerald-400 text-sm font-bold tracking-wider">\u25C9 ${S?"LIVE_ACTIVITY_STREAM":"ECO_ACTIVITY_STREAM"}</span>
                <div class="flex items-center gap-4">
                  <span class="text-emerald-500/60 text-xs">TODAY: <span class="text-emerald-400">${h.today_events||0}</span></span>
                  <span class="text-emerald-500/60 text-xs">TOTAL: <span class="text-emerald-400 tabular-nums">${h.total_events}</span></span>
                </div>
              </div>
              <div class="p-2 space-y-0.5 max-h-72 overflow-y-auto custom-scrollbar font-mono text-xs">
                ${h.recent.length===0?`
                  <p class="text-emerald-500/40 text-center py-8">[ NO ACTIVITY LOGGED ]</p>
                `:h.recent.slice(0,20).map((g,T)=>`
                  <div class="flex items-center gap-2 px-2 py-1.5 hover:bg-emerald-500/5 border-l-2 ${T===0?"border-emerald-400 bg-emerald-500/10":"border-transparent"} group">
                    <span class="text-emerald-600/80 w-14 text-[10px]">${this.formatTime(g.timestamp)}</span>
                    <span class="text-emerald-300 w-20 truncate font-medium">@${g.user_name||"unknown"}</span>
                    <span class="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[9px] uppercase tracking-wider w-28 text-center">${g.action}</span>
                    <span class="text-emerald-300/50 flex-1 truncate text-[10px]">${g.details?.content_preview?.slice(0,40)||g.details?.target_name||g.details?.post_id?.slice(0,8)||"\u2014"}</span>
                    <span class="text-emerald-600/40 text-[9px] opacity-0 group-hover:opacity-100">${g.user_id?.slice(0,6)}</span>
                  </div>
                `).join("")}
              </div>
            </div>

            <!-- Right Column - Metrics + Top Users -->
            <div class="space-y-4">
              <!-- Action Metrics -->
              <div class="bg-black border border-cyan-500/30 overflow-hidden">
                <div class="bg-cyan-500/10 border-b border-cyan-500/30 px-4 py-2 flex items-center justify-between">
                  <span class="text-cyan-400 text-sm font-bold tracking-wider">\u25C9 ACTION_METRICS</span>
                  <span class="text-cyan-500/50 text-[10px]">ALL TIME</span>
                </div>
                <div class="p-2 space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                  ${Object.entries(h.action_counts||{}).length===0?`
                    <p class="text-cyan-500/40 text-center py-4 text-xs">[ AWAITING DATA ]</p>
                  `:Object.entries(h.action_counts).map(([g,T])=>`
                    <div class="flex items-center justify-between py-1 px-2 hover:bg-cyan-500/5">
                      <span class="text-cyan-400/70 text-[10px] uppercase font-mono">${g.replace(/_/g,".")}</span>
                      <span class="text-cyan-300 font-bold tabular-nums text-sm">${T}</span>
                    </div>
                  `).join("")}
                </div>
              </div>

              <!-- Top Active Users -->
              <div class="bg-black border border-purple-500/30 overflow-hidden">
                <div class="bg-purple-500/10 border-b border-purple-500/30 px-4 py-2">
                  <span class="text-purple-400 text-sm font-bold tracking-wider">\u25C9 TOP_ACTIVE_USERS</span>
                </div>
                <div class="p-2 space-y-1">
                  ${(h.top_users||[]).length===0?`
                    <p class="text-purple-500/40 text-center py-4 text-xs">[ NO DATA ]</p>
                  `:(h.top_users||[]).map((g,T)=>`
                    <div class="flex items-center gap-2 py-1.5 px-2 hover:bg-purple-500/5">
                      <span class="text-purple-500/60 text-xs w-4">${T+1}.</span>
                      ${g.avatar?`<img src="${g.avatar}" class="w-5 h-5 rounded-sm object-cover border border-purple-500/30">`:`<div class="w-5 h-5 rounded-sm bg-purple-500/20 flex items-center justify-center text-purple-300 text-[10px]">${g.name?.charAt(0)||"?"}</div>`}
                      <span class="text-purple-200 text-xs font-medium flex-1 truncate">${g.name}</span>
                      <span class="text-purple-500/50 text-[9px]">${this.formatTime(g.last_active)}</span>
                    </div>
                  `).join("")}
                </div>
              </div>
            </div>
          </div>

          <!-- Pending Approvals -->
          ${u.length>0?`
            <div class="bg-black border border-amber-500/40 overflow-hidden">
              <div class="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center gap-2">
                <span class="text-amber-400 animate-pulse">\u26A0</span>
                <span class="text-amber-400 text-sm font-bold tracking-wider">PENDING_APPROVAL_QUEUE</span>
              </div>
              <div class="p-3 space-y-2">
                ${u.map(g=>`
                  <div class="flex items-center justify-between px-3 py-2 bg-amber-500/5 border border-amber-500/20 hover:border-amber-500/40 transition-colors" data-group-id="${g.id}">
                    <div>
                      <p class="text-amber-100 font-medium">${this.escapeHtml(g.name)}</p>
                      <p class="text-amber-500/60 text-xs">/${g.slug} \u2022 ${this.formatTime(g.created_at)}</p>
                    </div>
                    <div class="flex gap-2">
                      <button class="approve-btn px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 text-xs font-bold tracking-wider transition-colors" data-group-id="${g.id}">APPROVE</button>
                      <button class="reject-btn px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 text-xs font-bold tracking-wider transition-colors" data-group-id="${g.id}">REJECT</button>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          `:""}

          <!-- Bot Applications (Super Admin Only) -->
          ${S&&y.length>0?`
            <div class="bg-black border border-pink-500/40 overflow-hidden">
              <div class="bg-pink-500/10 border-b border-pink-500/30 px-4 py-2 flex items-center gap-2">
                <span class="text-pink-400 animate-pulse">\u{1F916}</span>
                <span class="text-pink-400 text-sm font-bold tracking-wider">PENDING_BOT_APPLICATIONS</span>
                <span class="text-pink-500/60 text-xs ml-auto">${y.length} PENDING</span>
              </div>
              <div class="p-3 space-y-2">
                ${y.map(g=>`
                  <div class="px-3 py-3 bg-pink-500/5 border border-pink-500/20 hover:border-pink-500/40 transition-colors" data-bot-app-id="${g.bot_id}">
                    <div class="flex items-center justify-between">
                      <div>
                        <p class="text-pink-100 font-medium">${this.escapeHtml(g.bot_name)}</p>
                        <p class="text-pink-500/60 text-xs">by @${this.escapeHtml(g.operator_name)} \u2022 ${this.formatTime(g.created_at)}</p>
                        <p class="text-pink-400/80 text-xs mt-1">${this.escapeHtml(g.purpose?.slice(0,100)||"No description")}</p>
                        <div class="flex gap-1 mt-2">
                          ${(g.capabilities_requested||[]).map(T=>`
                            <span class="px-1.5 py-0.5 bg-pink-500/20 text-pink-300 text-[10px] uppercase">${T}</span>
                          `).join("")}
                        </div>
                      </div>
                      <div class="flex gap-2">
                        <button class="approve-bot-btn px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 text-xs font-bold tracking-wider transition-colors" data-bot-id="${g.bot_id}" data-caps="${(g.capabilities_requested||[]).join(",")}">APPROVE</button>
                        <button class="reject-bot-btn px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 text-xs font-bold tracking-wider transition-colors" data-bot-id="${g.bot_id}">REJECT</button>
                      </div>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          `:""}

          <!-- All Bots (Super Admin Only) -->
          ${S&&w.length>0?`
            <div class="bg-black border border-pink-500/30 overflow-hidden">
              <div class="bg-pink-500/10 border-b border-pink-500/30 px-4 py-2 flex items-center justify-between">
                <span class="text-pink-400 text-sm font-bold tracking-wider">\u25C9 BOT_REGISTRY</span>
                <span class="text-pink-500/60 text-xs tabular-nums">${w.length} BOTS</span>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-xs">
                  <thead class="bg-pink-500/5 border-b border-pink-500/20">
                    <tr>
                      <th class="text-left py-2 px-4 text-pink-400/80 font-medium uppercase tracking-wider">BOT_NAME</th>
                      <th class="text-left py-2 px-4 text-pink-400/80 font-medium uppercase tracking-wider">STATUS</th>
                      <th class="text-left py-2 px-4 text-pink-400/80 font-medium uppercase tracking-wider">CAPABILITIES</th>
                      <th class="text-right py-2 px-4 text-pink-400/80 font-medium uppercase tracking-wider">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${w.map(g=>`
                      <tr class="border-b border-pink-500/10 hover:bg-pink-500/5 transition-colors">
                        <td class="py-2 px-4 text-pink-100 font-medium">${this.escapeHtml(g.displayName)}</td>
                        <td class="py-2 px-4">
                          ${g.status==="approved"?'<span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] uppercase">APPROVED</span>':""}
                          ${g.status==="active"?'<span class="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] uppercase">ACTIVE</span>':""}
                          ${g.status==="revoked"?'<span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] uppercase">REVOKED</span>':""}
                          ${!g.status||g.status==="pending"?'<span class="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] uppercase">PENDING</span>':""}
                        </td>
                        <td class="py-2 px-4 text-pink-400/70">
                          ${(g.capabilities_granted||[]).join(", ")||"\u2014"}
                        </td>
                        <td class="py-2 px-4 text-right">
                          ${g.status==="approved"||(g.capabilities_granted||[]).length>0?`
                            <button class="revoke-bot-btn px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-bold tracking-wider transition-colors" data-bot-id="${g.id}">REVOKE</button>
                          `:"\u2014"}
                        </td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            </div>
          `:""}

          <!-- Eco Bot Management (Eco Admin) -->
          ${!S&&w.length>0?`
            <div class="bg-black border border-pink-500/30 overflow-hidden">
              <div class="bg-pink-500/10 border-b border-pink-500/30 px-4 py-2 flex items-center justify-between">
                <span class="text-pink-400 text-sm font-bold tracking-wider">\u25C9 ECO_BOT_CONTROL</span>
                <span class="text-pink-500/60 text-xs tabular-nums">${w.length} BOTS</span>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-xs">
                  <thead class="bg-pink-500/5 border-b border-pink-500/20">
                    <tr>
                      <th class="text-left py-2 px-4 text-pink-400/80 font-medium uppercase tracking-wider">BOT_NAME</th>
                      <th class="text-left py-2 px-4 text-pink-400/80 font-medium uppercase tracking-wider">PLATFORM_STATUS</th>
                      <th class="text-left py-2 px-4 text-pink-400/80 font-medium uppercase tracking-wider">ECO_STATUS</th>
                      <th class="text-right py-2 px-4 text-pink-400/80 font-medium uppercase tracking-wider">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${w.map(g=>`
                      <tr class="border-b border-pink-500/10 hover:bg-pink-500/5 transition-colors">
                        <td class="py-2 px-4 text-pink-100 font-medium">${this.escapeHtml(g.displayName)}</td>
                        <td class="py-2 px-4">
                          ${g.status==="approved"?'<span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] uppercase">APPROVED</span>':""}
                          ${g.status==="active"?'<span class="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] uppercase">ACTIVE</span>':""}
                          ${g.status==="revoked"?'<span class="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] uppercase">REVOKED</span>':""}
                          ${!g.status||g.status==="pending"?'<span class="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] uppercase">PENDING</span>':""}
                        </td>
                        <td class="py-2 px-4">
                          ${g.eco_banned?'<span class="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] uppercase">BLOCKED</span>':'<span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] uppercase">ALLOWED</span>'}
                        </td>
                        <td class="py-2 px-4 text-right">
                          ${g.id==="geppetto-system-bot"?'<span class="px-2 py-0.5 text-zinc-500 text-[10px] uppercase tracking-wider">SYSTEM</span>':g.eco_banned?`
                            <button class="eco-unban-bot-btn px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-bold tracking-wider transition-colors" data-bot-id="${g.id}">UNBLOCK</button>
                          `:`
                            <button class="eco-ban-bot-btn px-2 py-1 bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 text-[10px] font-bold tracking-wider transition-colors" data-bot-id="${g.id}">BLOCK</button>
                          `}
                        </td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            </div>
          `:""}

          <!-- User Management -->
          <div class="bg-black border border-purple-500/30 overflow-hidden">
            <div class="bg-purple-500/10 border-b border-purple-500/30 px-4 py-2 flex items-center justify-between">
              <span class="text-purple-400 text-sm font-bold tracking-wider">\u25C9 ${S?"USER_DATABASE":"ECO_MEMBERS"}</span>
              <span class="text-purple-500/60 text-xs tabular-nums">${v.length} RECORDS</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-xs">
                <thead class="bg-purple-500/5 border-b border-purple-500/20">
                  <tr>
                    <th class="text-left py-2 px-4 text-purple-400/80 font-medium uppercase tracking-wider">USER_ID</th>
                    <th class="text-left py-2 px-4 text-purple-400/80 font-medium uppercase tracking-wider">DISPLAY_NAME</th>
                    <th class="text-left py-2 px-4 text-purple-400/80 font-medium uppercase tracking-wider">FIELD</th>
                    <th class="text-left py-2 px-4 text-purple-400/80 font-medium uppercase tracking-wider">STATUS</th>
                    <th class="text-right py-2 px-4 text-purple-400/80 font-medium uppercase tracking-wider">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  ${v.length===0?`
                    <tr><td colspan="5" class="text-center py-8 text-purple-500/40">[ NO USERS FOUND ]</td></tr>
                  `:v.slice(0,25).map(g=>`
                    <tr class="border-b border-purple-500/10 hover:bg-purple-500/5 transition-colors" data-user-id="${g.id}">
                      <td class="py-2 px-4 text-purple-400/60 font-mono">${g.id.slice(0,8)}</td>
                      <td class="py-2 px-4">
                        <div class="flex items-center gap-2">
                          ${g.avatar?`<img src="${g.avatar}" class="w-6 h-6 rounded-sm object-cover border border-purple-500/30">`:`<div class="w-6 h-6 rounded-sm bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs border border-purple-500/30">${g.displayName?.charAt(0)||"?"}</div>`}
                          <span class="text-purple-100 font-medium">${this.escapeHtml(g.displayName||"NULL")}</span>
                        </div>
                      </td>
                      <td class="py-2 px-4 text-purple-400/70">${this.escapeHtml(g.field||"\u2014")}</td>
                      <td class="py-2 px-4">
                        ${g.is_admin?'<span class="px-2 py-0.5 bg-purple-500/30 text-purple-300 text-[10px] uppercase tracking-wider">ADMIN</span>':""}
                        ${g.is_banned?'<span class="px-2 py-0.5 bg-emerald-500/30 text-emerald-300 text-[10px] uppercase tracking-wider">BANNED</span>':""}
                        ${!g.is_admin&&!g.is_banned?'<span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] uppercase tracking-wider">ACTIVE</span>':""}
                      </td>
                      <td class="py-2 px-4 text-right">
                        <div class="flex items-center justify-end gap-1">
                          ${g.is_admin?`
                            ${S?`
                              ${g.id!==this.appState.user?.id?`
                                <button class="remove-admin-btn px-2 py-1 bg-zinc-700/50 border border-zinc-600 text-zinc-400 hover:bg-zinc-600 text-[10px] font-bold tracking-wider transition-colors" data-user-id="${g.id}">\u2193 DEMOTE</button>
                              `:'<span class="text-purple-500/40 text-[10px]">[ SELF ]</span>'}
                            `:'<span class="text-purple-500/40 text-[10px]">[ ADMIN ]</span>'}
                          `:`
                            ${g.is_banned?`
                              <button class="unban-user-btn px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-bold tracking-wider transition-colors" data-user-id="${g.id}">UNBAN</button>
                            `:`
                              <button class="ban-user-btn px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-bold tracking-wider transition-colors" data-user-id="${g.id}">${S?"BAN":"ECO BAN"}</button>
                            `}
                            ${S?`
                              <button class="make-admin-btn px-2 py-1 bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 text-[10px] font-bold tracking-wider transition-colors" data-user-id="${g.id}">\u2191 ADMIN</button>
                            `:""}
                          `}
                        </div>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
            ${v.length>25?`<div class="px-4 py-2 border-t border-purple-500/20 text-purple-500/60 text-xs">Showing 25 of ${v.length} records</div>`:""}
          </div>

          <!-- Ecosystem Settings -->
          <div class="bg-black border border-teal-500/30 overflow-hidden">
            <div class="bg-teal-500/10 border-b border-teal-500/30 px-4 py-2 flex items-center justify-between">
              <span class="text-teal-400 text-sm font-bold tracking-wider">\u25C9 ECO_SETTINGS</span>
              <span class="text-teal-500/60 text-xs">${this.escapeHtml(k.slug||s.slice(0,8))}</span>
            </div>
            <div class="p-4 space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="text-teal-400/80 text-[10px] uppercase tracking-wider block">ECOSYSTEM NAME</label>
                  <input id="eco-name" type="text" value="${this.escapeHtml(k.name||"")}" class="w-full bg-black border border-teal-500/30 text-teal-100 px-3 py-2 text-xs font-mono focus:border-teal-400 focus:outline-none transition-colors" />
                </div>
                <div class="space-y-1">
                  <label class="text-teal-400/80 text-[10px] uppercase tracking-wider block">TAGLINE</label>
                  <input id="eco-tagline" type="text" value="${this.escapeHtml(k.tagline||"")}" placeholder="Short tagline..." class="w-full bg-black border border-teal-500/30 text-teal-100 px-3 py-2 text-xs font-mono focus:border-teal-400 focus:outline-none transition-colors placeholder-teal-500/30" />
                </div>
              </div>
              <div class="space-y-1">
                <label class="text-teal-400/80 text-[10px] uppercase tracking-wider block">DESCRIPTION</label>
                <textarea id="eco-description" rows="3" class="w-full bg-black border border-teal-500/30 text-teal-100 px-3 py-2 text-xs font-mono focus:border-teal-400 focus:outline-none transition-colors resize-none placeholder-teal-500/30" placeholder="Ecosystem description...">${this.escapeHtml(k.description||"")}</textarea>
              </div>
              <div class="space-y-1">
                <label class="text-teal-400/80 text-[10px] uppercase tracking-wider block">WEBSITE</label>
                <input id="eco-website" type="url" value="${this.escapeHtml(k.website||"")}" placeholder="https://..." class="w-full bg-black border border-teal-500/30 text-teal-100 px-3 py-2 text-xs font-mono focus:border-teal-400 focus:outline-none transition-colors placeholder-teal-500/30" />
              </div>
              <div class="grid grid-cols-3 gap-4">
                <div class="space-y-1">
                  <label class="text-teal-400/80 text-[10px] uppercase tracking-wider block">ACCENT COLOR</label>
                  <div class="flex items-center gap-2">
                    <input id="eco-accent-color" type="color" value="${k.accent_color||"#10b981"}" class="w-8 h-8 bg-transparent border border-teal-500/30 cursor-pointer" />
                    <input id="eco-accent-hex" type="text" value="${k.accent_color||"#10b981"}" class="flex-1 bg-black border border-teal-500/30 text-teal-100 px-3 py-2 text-xs font-mono focus:border-teal-400 focus:outline-none transition-colors" />
                  </div>
                </div>
                <div class="space-y-1">
                  <label class="text-teal-400/80 text-[10px] uppercase tracking-wider block">SECONDARY COLOR</label>
                  <div class="flex items-center gap-2">
                    <input id="eco-secondary-color" type="color" value="${k.secondary_color||"#6366f1"}" class="w-8 h-8 bg-transparent border border-teal-500/30 cursor-pointer" />
                    <input id="eco-secondary-hex" type="text" value="${k.secondary_color||"#6366f1"}" class="flex-1 bg-black border border-teal-500/30 text-teal-100 px-3 py-2 text-xs font-mono focus:border-teal-400 focus:outline-none transition-colors" />
                  </div>
                </div>
                <div class="space-y-1">
                  <label class="text-teal-400/80 text-[10px] uppercase tracking-wider block">THEME</label>
                  <select id="eco-theme" class="w-full bg-black border border-teal-500/30 text-teal-100 px-3 py-2 text-xs font-mono focus:border-teal-400 focus:outline-none transition-colors">
                    <option value="dark" ${(k.theme||"dark")==="dark"?"selected":""}>DARK</option>
                    <option value="light" ${k.theme==="light"?"selected":""}>LIGHT</option>
                    <option value="cyber" ${k.theme==="cyber"?"selected":""}>CYBER</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="text-teal-400/80 text-[10px] uppercase tracking-wider block">LOGO / ICON</label>
                  <div class="flex items-center gap-3">
                    ${k.icon?`<img src="${k.icon}" class="w-12 h-12 rounded border border-teal-500/30 object-cover" />`:`<div class="w-12 h-12 rounded border border-teal-500/20 bg-teal-500/5 flex items-center justify-center text-teal-500/40 text-lg">${(k.name||"E").charAt(0)}</div>`}
                    <div class="flex-1">
                      <label class="block px-3 py-2 bg-teal-500/10 border border-teal-500/30 text-teal-400 text-[10px] font-bold tracking-wider text-center cursor-pointer hover:bg-teal-500/20 transition-colors">
                        UPLOAD LOGO
                        <input id="eco-icon-upload" type="file" accept="image/*" class="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
                <div class="space-y-2">
                  <label class="text-teal-400/80 text-[10px] uppercase tracking-wider block">BANNER IMAGE</label>
                  <div class="flex items-center gap-3">
                    ${k.banner?`<img src="${k.banner}" class="w-20 h-12 rounded border border-teal-500/30 object-cover" />`:'<div class="w-20 h-12 rounded border border-teal-500/20 bg-teal-500/5 flex items-center justify-center text-teal-500/40 text-[10px]">NO BANNER</div>'}
                    <div class="flex-1">
                      <label class="block px-3 py-2 bg-teal-500/10 border border-teal-500/30 text-teal-400 text-[10px] font-bold tracking-wider text-center cursor-pointer hover:bg-teal-500/20 transition-colors">
                        UPLOAD BANNER
                        <input id="eco-banner-upload" type="file" accept="image/*" class="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-4 pt-2">
                <div class="flex items-center gap-3">
                  <label class="text-teal-400/80 text-[10px] uppercase tracking-wider">VISIBILITY</label>
                  <select id="eco-visibility" class="bg-black border border-teal-500/30 text-teal-100 px-3 py-1.5 text-xs font-mono focus:border-teal-400 focus:outline-none transition-colors">
                    <option value="public" ${(k.visibility||"public")==="public"?"selected":""}>PUBLIC</option>
                    <option value="unlisted" ${k.visibility==="unlisted"?"selected":""}>UNLISTED</option>
                    <option value="private" ${k.visibility==="private"?"selected":""}>PRIVATE</option>
                  </select>
                </div>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input id="eco-invite-only" type="checkbox" ${k.invite_only?"checked":""} class="w-4 h-4 accent-teal-500 cursor-pointer" />
                  <span class="text-teal-400/80 text-[10px] uppercase tracking-wider">INVITE ONLY</span>
                </label>
              </div>
              <div class="flex items-center justify-end gap-3 pt-2 border-t border-teal-500/20">
                <button id="eco-settings-save" class="px-6 py-2 bg-teal-500/20 border border-teal-500/40 text-teal-400 text-[10px] font-bold tracking-wider hover:bg-teal-500/30 transition-colors">SAVE CHANGES</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Terminal Footer -->
        <div class="bg-black border-t border-emerald-500/30 px-4 py-1.5 flex items-center justify-between text-xs">
          <span class="text-emerald-500/60">DEVNET_ADMIN_TERMINAL_v2.2.2 // WSB_EDITION</span>
          <span class="text-emerald-400/60">${L.toISOString()}</span>
        </div>
      </div>
    `),document.querySelectorAll(".approve-btn").forEach(g=>{g.addEventListener("click",async T=>{let $=T.currentTarget.dataset.groupId;$&&await this.adminAction($,"approve")})}),document.querySelectorAll(".reject-btn").forEach(g=>{g.addEventListener("click",async T=>{let $=T.currentTarget.dataset.groupId;$&&confirm("Are you sure you want to reject this group?")&&await this.adminAction($,"reject")})}),document.querySelectorAll(".ban-user-btn").forEach(g=>{g.addEventListener("click",async T=>{let $=T.currentTarget.dataset.userId;$&&confirm("Ban this user?")&&await this.userAction($,"ban")})}),document.querySelectorAll(".unban-user-btn").forEach(g=>{g.addEventListener("click",async T=>{let $=T.currentTarget.dataset.userId;$&&await this.userAction($,"unban")})}),document.querySelectorAll(".make-admin-btn").forEach(g=>{g.addEventListener("click",async T=>{let $=T.currentTarget.dataset.userId;$&&confirm("Grant admin privileges to this user?")&&await this.userAction($,"make-admin")})}),document.querySelectorAll(".remove-admin-btn").forEach(g=>{g.addEventListener("click",async T=>{let $=T.currentTarget.dataset.userId;$&&confirm("Remove admin privileges from this user?")&&await this.userAction($,"remove-admin")})}),document.querySelectorAll(".approve-bot-btn").forEach(g=>{g.addEventListener("click",async T=>{let $=T.currentTarget.dataset.botId,F=T.currentTarget.dataset.caps?.split(",").filter(Q=>Q)||[];$&&confirm(`Approve this bot with capabilities: ${F.join(", ")}?`)&&await this.botAction($,"approve",F)})}),document.querySelectorAll(".reject-bot-btn").forEach(g=>{g.addEventListener("click",async T=>{let $=T.currentTarget.dataset.botId;$&&confirm("Reject this bot application?")&&await this.botAction($,"reject")})}),document.querySelectorAll(".revoke-bot-btn").forEach(g=>{g.addEventListener("click",async T=>{let $=T.currentTarget.dataset.botId;$&&confirm("Revoke this bot's capabilities?")&&await this.botAction($,"revoke")})}),document.querySelectorAll(".eco-ban-bot-btn").forEach(g=>{g.addEventListener("click",async T=>{let $=T.currentTarget.dataset.botId;$&&confirm("Block this bot from your ecosystem? It will be unable to post or apply to groups.")&&await this.ecoBotAction($,"eco-ban")})}),document.querySelectorAll(".eco-unban-bot-btn").forEach(g=>{g.addEventListener("click",async T=>{let $=T.currentTarget.dataset.botId;$&&await this.ecoBotAction($,"eco-unban")})});let le=document.getElementById("eco-accent-color"),V=document.getElementById("eco-accent-hex");le&&V&&(le.addEventListener("input",()=>{V.value=le.value}),V.addEventListener("input",()=>{/^#[0-9a-fA-F]{6}$/.test(V.value)&&(le.value=V.value)}));let de=document.getElementById("eco-secondary-color"),Z=document.getElementById("eco-secondary-hex");de&&Z&&(de.addEventListener("input",()=>{Z.value=de.value}),Z.addEventListener("input",()=>{/^#[0-9a-fA-F]{6}$/.test(Z.value)&&(de.value=Z.value)}));let z=async g=>{let T=new FormData;T.append("file",g);let $=await fetch("/api/upload/image",{method:"POST",headers:{"X-Auth-Hash":this.appState.hash||""},body:T});return $.ok?(await $.json()).url||null:(C("Image upload failed","error"),null)};document.getElementById("eco-icon-upload")?.addEventListener("change",async g=>{let T=g.target.files?.[0];if(!T)return;C("Uploading logo...","info");let $=await z(T);$&&await this.saveEcoSettings(s,{icon:$})}),document.getElementById("eco-banner-upload")?.addEventListener("change",async g=>{let T=g.target.files?.[0];if(!T)return;C("Uploading banner...","info");let $=await z(T);$&&await this.saveEcoSettings(s,{banner:$})}),document.getElementById("eco-settings-save")?.addEventListener("click",async()=>{let g={},T=document.getElementById("eco-name"),$=document.getElementById("eco-tagline"),F=document.getElementById("eco-description"),Q=document.getElementById("eco-website"),fe=document.getElementById("eco-theme"),Me=document.getElementById("eco-invite-only"),Ge=document.getElementById("eco-visibility");T&&(g.name=T.value),$&&(g.tagline=$.value),F&&(g.description=F.value),Q&&(g.website=Q.value),V&&(g.accent_color=V.value),Z&&(g.secondary_color=Z.value),fe&&(g.theme=fe.value),Ge&&(g.visibility=Ge.value),Me&&(g.invite_only=Me.checked),await this.saveEcoSettings(s,g)})}async botAction(e,t,s){let i=JSON.stringify(t==="approve"?{capabilities:s}:{reason:"Admin action"});if((await fetch(`/api/admin/bots/${e}/${t}`,{method:"POST",headers:{"X-Auth-Hash":this.appState.hash||"","Content-Type":"application/json"},body:i})).ok){let n=document.querySelector(`[data-bot-app-id="${e}"]`);n&&(n.style.transition="all 0.3s ease",n.style.opacity="0.3",n.style.transform="translateX(20px)"),C(`Bot ${t==="approve"?"approved":t==="reject"?"rejected":"revoked"} successfully`,t==="approve"?"success":"info"),setTimeout(()=>this.showAdmin(),600)}else C(`Failed to ${t} bot`,"error")}async ecoBotAction(e,t){let s=this.activeEcosystem?.id||this.defaultEcosystemId;(await fetch(`/api/admin/bots/${e}/${t}?ecosystem_id=${s}`,{method:"POST",headers:{"X-Auth-Hash":this.appState.hash||"","Content-Type":"application/json"}})).ok?(C(`Bot ${t==="eco-ban"?"blocked from ecosystem":"unblocked in ecosystem"}`,t==="eco-ban"?"info":"success"),setTimeout(()=>this.showAdmin(),600)):C(`Failed to ${t} bot`,"error")}async saveEcoSettings(e,t){let s=await fetch(`/api/ecosystems/${e}`,{method:"PATCH",headers:{"X-Auth-Hash":this.appState.hash||"","Content-Type":"application/json"},body:JSON.stringify(t)});if(s.ok){let i=await s.json();this.activeEcosystem&&this.activeEcosystem.id===e&&(this.activeEcosystem={...this.activeEcosystem,...i},this.applyEcosystemColors(this.activeEcosystem));let a=this.userEcosystems.findIndex(n=>n.id===e);a>=0&&(this.userEcosystems[a]={...this.userEcosystems[a],...i}),C("Ecosystem settings saved","success"),setTimeout(()=>this.showAdmin(),400)}else{let i=await s.json().catch(()=>({}));C(i.detail||"Failed to save settings","error")}}async userAction(e,t){let s=this.activeEcosystem?.id||this.defaultEcosystemId;if(!(await fetch(`/api/admin/users/${e}/${t}?ecosystem_id=${s}`,{method:"POST",headers:{"X-Auth-Hash":this.appState.hash||""}})).ok){C(`Failed to ${t.replace("-"," ")} user`,"error");return}let a=document.querySelector(`tr[data-user-id="${e}"]`);a&&(a.style.transition="all 0.3s ease",a.style.background="rgba(16,185,129,0.1)"),C(`User ${{ban:"banned",unban:"unbanned","make-admin":"promoted to admin","remove-admin":"demoted"}[t]||t} successfully`,"success"),setTimeout(()=>this.showAdmin(),600)}async adminAction(e,t){if((await fetch(`/api/admin/groups/${e}/${t}`,{method:"POST",headers:{"X-Auth-Hash":this.appState.hash||""}})).ok){let i=document.querySelector(`[data-group-id="${e}"]`);i&&(i.style.transition="all 0.3s ease",i.style.opacity="0.3",i.style.transform="translateX(20px)"),C(`Group ${t==="approve"?"approved":"rejected"} successfully`,t==="approve"?"success":"info"),setTimeout(()=>this.showAdmin(),600)}else C(`Failed to ${t} group`,"error")}currentGroup=null;groupSocket=null;groupMessages=[];currentGroupId=null;replyingTo=null;viewingThreadId=null;isOpeningGroup=!1;hasMoreMessages=!1;nextBefore=null;isLoadingMore=!1;scrollObserver=null;async showGroups(){this.setActiveNav("nav-groups");let e=await fetch(`/api/groups?ecosystem_id=${this.activeEcosystem?.id||this.defaultEcosystemId}`,{headers:{"X-Auth-Hash":this.appState.hash||""}}),t=e.ok?await e.json():[];this.setContent(`
      <div class="h-full w-full flex flex-col">
        <div class="panel flex-1">
          <div class="panel-header">
            <div class="flex items-center gap-3">
              <span class="panel-title">${this.escapeHtml(this.activeEcosystem?.name||"Communities")}</span>
              <span class="text-xs text-zinc-500">${t.length} groups</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="relative">
                <input type="text" id="groups-search" placeholder="Search groups..." class="input text-sm py-1.5 pl-8 pr-3 w-48" />
                <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>
              <button id="create-group-btn" class="btn btn-primary text-xs py-1.5 px-3">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Create
              </button>
            </div>
          </div>
          <div class="panel-body p-4 overflow-y-auto">
            <div id="groups-container" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          ${t.length===0?`
            <div class="col-span-full text-center py-16">
              <div class="relative inline-flex items-center justify-center w-16 h-16 mb-4">
                <div class="absolute inset-0 bg-zinc-800 rounded-2xl"></div>
                <svg class="relative w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <h3 class="font-medium text-zinc-400 mb-1">No groups yet</h3>
              <p class="text-sm text-zinc-600">Create a group to start chatting</p>
            </div>
          `:t.map(m=>`
            <div class="group-card relative group/card rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1" data-group-id="${m.id}" data-status="${m.status||"approved"}">
              <div class="absolute -inset-[1px] rounded-xl ${m.status==="pending"?"bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500":m.is_member?"bg-gradient-to-r from-emerald-500 via-red-400 to-emerald-500":"bg-gradient-to-r from-zinc-700 via-zinc-600 to-zinc-700"} opacity-${m.is_member?"100":"50"} group-hover/card:opacity-100 transition-opacity duration-300 animate-gradient-x"></div>
              <div class="relative bg-zinc-900 rounded-xl p-4 h-full flex flex-col">
                <div class="flex flex-col items-center text-center mb-3">
                  ${m.avatar?`
                    <div class="relative mb-3">
                      <div class="absolute -inset-1 rounded-xl ${m.status==="pending"?"bg-gradient-to-r from-amber-500 to-orange-500":"bg-gradient-to-r from-emerald-500 to-emerald-400"} opacity-75 blur-sm"></div>
                      <img src="${m.avatar}" alt="${m.name}" class="relative w-16 h-16 rounded-xl object-cover ring-2 ${m.status==="pending"?"ring-amber-500":"ring-emerald-500"}">
                    </div>
                  `:`
                    <div class="relative mb-3">
                      <div class="absolute -inset-1 rounded-xl ${m.status==="pending"?"bg-gradient-to-r from-amber-500 to-orange-500":"bg-gradient-to-r from-emerald-500 to-emerald-400"} opacity-50 blur-sm group-hover/card:opacity-75 transition-opacity"></div>
                      <div class="relative w-16 h-16 rounded-xl ${m.status==="pending"?"bg-gradient-to-br from-amber-500/30 to-orange-500/30":"bg-gradient-to-br from-emerald-500/30 to-emerald-500/30"} flex items-center justify-center backdrop-blur-sm">
                        <span class="text-2xl font-bold ${m.status==="pending"?"text-amber-400":"text-emerald-400"} drop-shadow-glow">${m.name.charAt(0).toUpperCase()}</span>
                      </div>
                    </div>
                  `}
                  <h3 class="font-semibold text-zinc-100 truncate w-full group-hover/card:text-white transition-colors flex items-center justify-center gap-1.5">
                    ${m.privacy==="private"?'<i data-lucide="lock" class="w-3.5 h-3.5 text-amber-400 flex-shrink-0"></i>':""}
                    <span class="truncate">${this.escapeHtml(m.name)}</span>
                  </h3>
                  <p class="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                    ${m.status==="pending"?`
                      <svg class="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>
                      <span class="text-amber-400">Pending</span>
                    `:m.privacy==="private"?`
                      <i data-lucide="lock" class="w-3 h-3 text-amber-400"></i>
                      <span class="text-amber-400">Private</span>
                      <span class="text-zinc-600 mx-1">&bull;</span>
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
                      ${m.member_count||0}
                    `:`
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
                      ${m.member_count||0} members
                    `}
                  </p>
                </div>
                <div class="mt-auto pt-2">
                  ${m.status==="pending"?`
                    <span class="block text-center text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg py-2 backdrop-blur-sm">Awaiting Approval</span>
                  `:m.is_member?`
                    <button class="enter-group-btn w-full text-xs py-2 px-4 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-600 hover:from-emerald-500 hover:to-emerald-500 text-white font-medium transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40" data-group-id="${m.id}">
                      <span class="flex items-center justify-center gap-1.5">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                        Enter
                      </span>
                    </button>
                  `:`
                    <button class="join-group-btn w-full text-xs py-2 px-4 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-medium transition-all duration-200 border border-zinc-600" data-group-id="${m.id}">
                      <span class="flex items-center justify-center gap-1.5">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
                        Join
                      </span>
                    </button>
                  `}
                </div>
              </div>
            </div>
          `).join("")}
            </div>
          </div>
        </div>
      </div>
      
      <div id="create-group-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm hidden items-center justify-center z-50">
        <div class="card max-w-md w-full mx-4 slide-up max-h-[90vh] overflow-y-auto">
          <h2 class="text-xl font-bold text-zinc-100 mb-6 flex items-center gap-2">
            <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            Create Community
          </h2>
          <form id="create-group-form" class="space-y-4">
            <div class="flex justify-center">
              <div class="relative group">
                <div id="group-avatar-preview" style="width: 80px; height: 80px; border-radius: 16px; background: linear-gradient(135deg, #3f3f46, #27272a); display: flex; align-items: center; justify-content: center; cursor: pointer; border: 2px dashed #52525b; transition: all 0.2s;" class="hover:border-emerald-500">
                  <svg class="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
                <input type="file" id="group-avatar-input" accept="image/*" class="hidden">
                <p class="text-xs text-zinc-500 text-center mt-2">Community Photo</p>
              </div>
            </div>
            <input type="hidden" name="avatar" id="group-avatar-url" value="">
            <div>
              <label class="block text-sm font-medium text-zinc-300 mb-2">Privacy</label>
              <div class="flex rounded-lg overflow-hidden border border-zinc-700">
                <button type="button" id="privacy-public-btn" class="flex-1 py-2.5 text-sm font-medium transition-colors bg-emerald-500/20 text-emerald-400 border-r border-zinc-700" data-privacy="public">
                  <i data-lucide="globe" class="w-4 h-4 inline-block mr-1"></i>Public
                </button>
                <button type="button" id="privacy-private-btn" class="flex-1 py-2.5 text-sm font-medium transition-colors text-zinc-400 hover:text-zinc-200" data-privacy="private">
                  <i data-lucide="lock" class="w-4 h-4 inline-block mr-1"></i>Private
                </button>
              </div>
              <input type="hidden" name="privacy" id="group-privacy-input" value="public">
            </div>
            <div>
              <label class="block text-sm font-medium text-zinc-300 mb-2">Name</label>
              <input type="text" name="name" class="input" placeholder="My Awesome Community" required />
            </div>
            <div id="slug-field">
              <label class="block text-sm font-medium text-zinc-300 mb-2">Slug</label>
              <input type="text" name="slug" class="input font-mono" placeholder="my-community" pattern="[a-z0-9\\-]{3,30}" />
              <p class="text-xs text-zinc-500 mt-2">3-30 lowercase letters, numbers, and hyphens</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-zinc-300 mb-2">What is this community for? <span class="text-emerald-400">*</span></label>
              <textarea name="description" class="input resize-none" rows="3" placeholder="Describe the purpose of this community..." required></textarea>
              <p id="create-group-approval-hint" class="text-xs text-zinc-500 mt-1">This helps admins understand and approve your community faster</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-zinc-300 mb-2">Terms (optional)</label>
              <textarea name="terms" class="input resize-none" rows="2" placeholder="Rules members must agree to"></textarea>
            </div>
            <div class="flex gap-3 pt-2">
              <button type="button" id="cancel-create-group" class="btn btn-secondary flex-1">Cancel</button>
              <button type="submit" class="btn btn-primary flex-1">Create</button>
            </div>
            <p id="create-group-error" class="text-red-400 text-sm text-center hidden"></p>
            <p id="create-group-status-hint" class="text-xs text-zinc-500 text-center pt-2">Public communities require admin approval before going live</p>
          </form>
        </div>
      </div>
    `),document.getElementById("create-group-btn")?.addEventListener("click",()=>{document.getElementById("create-group-modal")?.classList.remove("hidden"),document.getElementById("create-group-modal")?.classList.add("flex")}),document.getElementById("cancel-create-group")?.addEventListener("click",()=>{document.getElementById("create-group-modal")?.classList.add("hidden"),document.getElementById("create-group-modal")?.classList.remove("flex")}),document.getElementById("group-avatar-preview")?.addEventListener("click",()=>{document.getElementById("group-avatar-input")?.click()}),document.getElementById("group-avatar-input")?.addEventListener("change",async m=>{let f=m.target.files?.[0];if(!f)return;let b=document.getElementById("group-avatar-preview");b&&(b.innerHTML='<div class="animate-pulse w-full h-full rounded-2xl bg-zinc-700"></div>');try{let u=new FormData;u.append("file",f);let h=await fetch("/api/upload/image",{method:"POST",headers:{"X-Auth-Hash":this.appState.hash||""},body:u});if(h.ok){let v=await h.json();document.getElementById("group-avatar-url").value=v.url,b&&(b.innerHTML=`<img src="${v.url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 16px;">`,b.style.border="2px solid #10b981"),D("Photo uploaded!","success")}else D("Failed to upload photo","error")}catch{b&&(b.innerHTML='<svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>'),D("Failed to upload photo","error")}});let s=document.getElementById("privacy-public-btn"),i=document.getElementById("privacy-private-btn"),a=document.getElementById("group-privacy-input"),n=document.getElementById("slug-field"),l=document.getElementById("create-group-approval-hint"),o=document.getElementById("create-group-status-hint"),r=m=>{a.value=m,m==="private"?(i?.classList.add("bg-amber-500/20","text-amber-400"),i?.classList.remove("text-zinc-400","hover:text-zinc-200"),s?.classList.remove("bg-emerald-500/20","text-emerald-400"),s?.classList.add("text-zinc-400","hover:text-zinc-200"),n&&(n.style.display="none"),l&&(l.textContent="Private communities are approved instantly"),o&&(o.textContent="Invite-only \u2014 members join via private link")):(s?.classList.add("bg-emerald-500/20","text-emerald-400"),s?.classList.remove("text-zinc-400","hover:text-zinc-200"),i?.classList.remove("bg-amber-500/20","text-amber-400"),i?.classList.add("text-zinc-400","hover:text-zinc-200"),n&&(n.style.display=""),l&&(l.textContent="This helps admins understand and approve your community faster"),o&&(o.textContent="Public communities require admin approval before going live")),window.lucide&&window.lucide.createIcons()};s?.addEventListener("click",()=>r("public")),i?.addEventListener("click",()=>r("private")),document.getElementById("create-group-form")?.addEventListener("submit",async m=>{m.preventDefault(),await this.createGroup()}),document.querySelectorAll(".group-card").forEach(m=>{m.addEventListener("click",f=>{let b=f.target;if(b.closest(".join-group-btn")||b.closest(".enter-group-btn"))return;let u=m.dataset.groupId;m.dataset.status!=="pending"&&u&&this.openGroup(u)})}),document.querySelectorAll(".enter-group-btn").forEach(m=>{m.addEventListener("click",async f=>{f.stopPropagation();let b=m.dataset.groupId;b&&this.openGroup(b,!0)})}),document.querySelectorAll(".join-group-btn").forEach(m=>{m.addEventListener("click",async f=>{f.stopPropagation();let b=m.dataset.groupId;b&&await this.joinGroup(b)})});let c=document.getElementById("groups-search");c?.addEventListener("input",()=>{let m=c.value.toLowerCase().trim();document.querySelectorAll(".group-card").forEach(f=>{let b=(f.querySelector("h3")?.textContent||"").toLowerCase();f.style.display=b.includes(m)?"":"none"})})}async createGroup(){let e=document.getElementById("create-group-form"),t=new FormData(e),s=document.getElementById("create-group-error");s.classList.add("hidden");try{let i=await fetch("/api/groups",{method:"POST",headers:{"Content-Type":"application/json","X-Auth-Hash":this.appState.hash||""},body:JSON.stringify({name:t.get("name"),slug:t.get("slug")||"",description:t.get("description"),terms:t.get("terms"),avatar:t.get("avatar"),privacy:t.get("privacy")||"public",ecosystem_id:this.activeEcosystem?.id||this.defaultEcosystemId})});if(i.ok){document.getElementById("create-group-modal")?.classList.add("hidden"),document.getElementById("create-group-modal")?.classList.remove("flex");let a=t.get("privacy")||"public";this.showGroupCreatedSuccess(t.get("name"),a)}else{let a=await i.json();s.textContent=a.detail||"Failed to create group",s.classList.remove("hidden")}}catch{s.textContent="Failed to create group",s.classList.remove("hidden")}}showGroupCreatedSuccess(e,t="public"){let s=t==="private";this.setContent(`
      <div class="max-w-lg mx-auto px-4 py-12">
        <div class="card text-center slide-up">
          <div class="relative inline-block mb-6">
            <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${s?"from-emerald-500/20 to-emerald-500/20 border-emerald-500/30":"from-amber-500/20 to-orange-500/20 border-amber-500/30"} border">
              <svg class="w-10 h-10 ${s?"text-emerald-400":"text-amber-400"}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                ${s?'<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>':'<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>'}
              </svg>
            </div>
          </div>
          
          <h2 class="text-2xl font-bold text-zinc-100 mb-2">Community Created!</h2>
          <p class="text-zinc-400 mb-6">"${this.escapeHtml(e)}" ${s?"is ready to use":"is now in moderation"}</p>
          
          <div class="${s?"bg-emerald-500/10 border-emerald-500/30":"bg-amber-500/10 border-amber-500/30"} border rounded-xl p-4 mb-6 text-left">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 ${s?"text-emerald-400":"text-amber-400"} mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div>
                ${s?`
                <p class="text-sm font-medium text-emerald-300 mb-1">Private Community Active</p>
                <p class="text-sm text-zinc-400">Your private community is live. Share the invite link with people you want to join.</p>
                `:`
                <p class="text-sm font-medium text-amber-300 mb-1">Awaiting Admin Approval</p>
                <p class="text-sm text-zinc-400">An admin will review your community description and approve it shortly. You'll see it appear in your communities list once approved.</p>
                `}
              </div>
            </div>
          </div>
          
          <button id="back-to-groups-btn" class="btn btn-primary w-full py-3">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 17l-5-5m0 0l5-5m-5 5h12"/>
            </svg>
            Back to Communities
          </button>
        </div>
      </div>
    `),document.getElementById("back-to-groups-btn")?.addEventListener("click",()=>{this.showGroups()})}async joinGroup(e){let t=await fetch(`/api/groups/${e}`,{headers:{"X-Auth-Hash":this.appState.hash||""}});if(!t.ok)return;let s=await t.json();if(s.terms&&!confirm(`Terms for ${s.name}:

${s.terms}

Do you agree?`))return;let i=document.querySelector(`.join-group-btn[data-group-id="${e}"]`);i&&(i.innerHTML='<span class="flex items-center justify-center gap-1.5"><svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Joining...</span>',i.classList.add("pointer-events-none","opacity-70"));let a=await fetch(`/api/groups/${e}/join`,{method:"POST",headers:{"Content-Type":"application/json","X-Auth-Hash":this.appState.hash||""},body:JSON.stringify({agreed_to_terms:!0})});if(a.ok)C(`Joined "${s.name}" successfully!`,"success"),this.showGroups();else{let n=await a.json().catch(()=>({detail:"Failed to join"}));C(n.detail||"Failed to join group","error"),i&&(i.innerHTML='<span class="flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>Join</span>',i.classList.remove("pointer-events-none","opacity-70"))}}async openGroup(e,t=!1){if(!this.isOpeningGroup){this.isOpeningGroup=!0,this.currentGroupId=e;try{let[s,i]=await Promise.all([fetch(`/api/groups/${e}`,{headers:{"X-Auth-Hash":this.appState.hash||""}}),fetch("/api/groups",{headers:{"X-Auth-Hash":this.appState.hash||""}})]);if(!s.ok)return;let a=await s.json(),n=i.ok?await i.json():[],l=Array.isArray(n)?n:[];if(!t&&!a.is_member){await this.joinGroup(e);return}this.currentGroup=a;let[o,r]=await Promise.all([fetch(`/api/groups/${e}/messages`,{headers:{"X-Auth-Hash":this.appState.hash||""}}),fetch(`/api/groups/${e}/members`,{headers:{"X-Auth-Hash":this.appState.hash||""}})]),c=o.ok?await o.json():{messages:[],has_more:!1,next_before:null};c&&c.messages?(this.groupMessages=Array.isArray(c.messages)?c.messages:[],this.hasMoreMessages=c.has_more||!1,this.nextBefore=c.next_before??null):(this.groupMessages=Array.isArray(c)?c:[],this.hasMoreMessages=!1,this.nextBefore=null);let m=r.ok?await r.json():{members:[]},f=Array.isArray(m.members)?m.members:Array.isArray(m)?m:[];this.setActiveNav("nav-groups"),this.setContent(`
      <div class="h-full w-full flex flex-col md:flex-row bg-zinc-950" style="max-height: 100%; overflow: hidden;">
        <!-- MOBILE TABS -->
        <div class="md:hidden flex border-b border-zinc-800 bg-zinc-900">
          <button id="mobile-tab-groups" class="mobile-tab flex-1 py-3 text-center text-sm font-medium text-zinc-400 border-b-2 border-transparent" data-tab="groups">
            <i data-lucide="hash" class="w-4 h-4 inline-block mr-1"></i>Communities
          </button>
          <button id="mobile-tab-chat" class="mobile-tab flex-1 py-3 text-center text-sm font-medium text-emerald-400 border-b-2 border-emerald-500" data-tab="chat">
            <i data-lucide="message-square" class="w-4 h-4 inline-block mr-1"></i>Chat
          </button>
          <button id="mobile-tab-threads" class="mobile-tab flex-1 py-3 text-center text-sm font-medium text-zinc-400 border-b-2 border-transparent" data-tab="threads">
            <i data-lucide="git-branch" class="w-4 h-4 inline-block mr-1"></i>Threads
          </button>
          <button id="mobile-tab-members" class="mobile-tab flex-1 py-3 text-center text-sm font-medium text-zinc-400 border-b-2 border-transparent" data-tab="members">
            <i data-lucide="users" class="w-4 h-4 inline-block mr-1"></i>Members
          </button>
        </div>
        
        <!-- LEFT SIDEBAR: Groups/Threads List -->
        <div id="panel-groups" class="hidden md:flex w-full md:w-64 flex-shrink-0 border-r border-zinc-800 flex-col bg-zinc-900/50 overflow-hidden transition-all duration-200" style="min-height:0;flex:1 1 0%;">
          <div class="flex items-center border-b border-zinc-800 flex-shrink-0">
            <button id="left-tab-communities" class="left-sidebar-tab flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-emerald-400 border-b-2 border-emerald-500 transition-colors" data-tab="communities">
              <i data-lucide="hash" class="w-3.5 h-3.5 inline-block mr-1"></i>Communities
            </button>
            <button id="left-tab-threads" class="left-sidebar-tab flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-zinc-500 border-b-2 border-transparent hover:text-zinc-300 transition-colors" data-tab="threads">
              <i data-lucide="git-branch" class="w-3.5 h-3.5 inline-block mr-1"></i>Threads
            </button>
            <button id="left-sidebar-collapse" class="hidden md:flex p-2 text-zinc-500 hover:text-zinc-200 transition-colors flex-shrink-0" title="Collapse sidebar">
              <i data-lucide="panel-left-close" class="w-4 h-4"></i>
            </button>
          </div>
          <div id="left-tab-content-communities" class="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1" style="-webkit-overflow-scrolling:touch;min-height:0;max-height:100%;">
            ${l.filter(u=>u.status!=="pending").map(u=>`
              <button class="group-nav-item w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all ${u.id===e?"bg-emerald-500/20 text-emerald-400 border border-emerald-500/30":"text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"}" data-group-id="${u.id}">
                ${u.avatar?`
                  <img src="${u.avatar}" class="w-8 h-8 rounded-lg object-cover flex-shrink-0">
                `:`
                  <div class="w-8 h-8 rounded-lg bg-zinc-700/50 flex items-center justify-center flex-shrink-0">
                    <span class="text-sm font-bold ${u.id===e?"text-emerald-400":"text-zinc-500"}">${u.name.charAt(0).toUpperCase()}</span>
                  </div>
                `}
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium truncate flex items-center gap-1">${u.privacy==="private"?'<i data-lucide="lock" class="w-3 h-3 text-amber-400 flex-shrink-0"></i>':""}${this.escapeHtml(u.name)}</p>
                  <p class="text-xs text-zinc-600 truncate">${u.privacy==="private"?"Private":(u.member_count||0)+" members"}</p>
                </div>
              </button>
            `).join("")}
          </div>
          <div id="left-tab-content-threads" class="hidden flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2" style="-webkit-overflow-scrolling:touch;min-height:0;max-height:100%;">
            <div class="flex items-center justify-center h-32 text-zinc-500 text-sm">
              <div class="text-center">
                <i data-lucide="git-branch" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
                <p>No threads yet</p>
                <p class="text-xs text-zinc-600 mt-1">Reply to a message to start a thread</p>
              </div>
            </div>
          </div>
          <div class="p-3 border-t border-zinc-800">
            <button id="back-to-groups-list" class="w-full text-left px-3 py-2 rounded-lg text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/50 flex items-center gap-2 text-sm transition-colors">
              <i data-lucide="plus" class="w-4 h-4"></i>
              Browse All Communities
            </button>
          </div>
        </div>
        <!-- LEFT SIDEBAR EXPAND BUTTON (when collapsed) -->
        <div id="left-sidebar-expand" class="hidden flex-shrink-0 border-r border-zinc-800 bg-zinc-900/50 flex-col items-center py-2">
          <button id="left-sidebar-expand-btn" class="p-2 text-zinc-500 hover:text-zinc-200 transition-colors" title="Expand sidebar">
            <i data-lucide="panel-left-open" class="w-4 h-4"></i>
          </button>
        </div>
        
        <!-- CENTER: Chat Area -->
        <div id="panel-chat" class="flex md:flex flex-1 flex-col min-w-0" style="min-height: 0; overflow: hidden;">
          <!-- Group Header -->
          <div class="group-header-epic relative overflow-hidden border-b border-zinc-800 flex-shrink-0">
            <div class="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-zinc-900/90"></div>
            ${a.avatar?`<div class="absolute inset-0 opacity-10 blur-2xl" style="background-image: url('${a.avatar}'); background-size: cover; background-position: center;"></div>`:""}
            
            <div class="relative px-4 py-3 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="relative">
                  ${a.avatar?`
                    <img src="${a.avatar}" alt="${a.name}" class="w-10 h-10 rounded-xl object-cover border border-emerald-500/50">
                  `:`
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                      <span class="text-lg font-bold text-emerald-400">${a.name.charAt(0).toUpperCase()}</span>
                    </div>
                  `}
                </div>
                <div>
                  <h2 class="font-bold text-zinc-100 flex items-center gap-1.5">${a.privacy==="private"?'<i data-lucide="lock" class="w-4 h-4 text-amber-400"></i>':""}${this.escapeHtml(a.name)}</h2>
                  <p class="text-xs text-zinc-500">${a.privacy==="private"?'<span class="text-amber-400">Private</span> \u2022 ':"/g/"+a.slug+" \u2022 "}${f.length} members</p>
                </div>
              </div>
              
              <div class="flex items-center gap-1">
                ${a.user_role==="owner"||a.user_role==="admin"||this.appState.user?.is_admin?`
                  <button id="group-members-manage-btn" class="text-zinc-400 hover:text-zinc-100 transition-colors p-2 rounded-lg hover:bg-zinc-800/50" title="Manage Members">
                    <i data-lucide="users-round" class="w-4 h-4"></i>
                  </button>
                  <button id="group-settings-btn" class="text-zinc-400 hover:text-zinc-100 transition-colors p-2 rounded-lg hover:bg-zinc-800/50" title="Settings">
                    <i data-lucide="settings" class="w-4 h-4"></i>
                  </button>
                `:""}
                ${a.creator_id!==this.appState.user?.id?`
                  <button id="leave-group-btn" class="text-zinc-400 hover:text-emerald-400 transition-colors p-2 rounded-lg hover:bg-emerald-500/10" title="Leave Group" data-group-id="${a.id}">
                    <i data-lucide="log-out" class="w-4 h-4"></i>
                  </button>
                `:""}
              </div>
            </div>
          </div>
          
          <!-- Messages -->
          <div id="messages-container" class="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-3 bg-zinc-950">
            ${this.renderMessages()}
          </div>
          
          <!-- Message Input -->
          <div class="px-4 py-3 border-t border-zinc-800 bg-zinc-900 flex-shrink-0">
            <div id="reply-preview" class="hidden mb-2 px-3 py-2 rounded-lg bg-zinc-800/80 border-l-2 border-emerald-500 flex items-center gap-2" style="animation: slideDown 0.15s ease-out;">
              <div class="flex-1 min-w-0">
                <p class="text-[11px] font-semibold text-emerald-400" id="reply-to-name"></p>
                <p class="text-xs text-zinc-400 truncate" id="reply-to-content"></p>
              </div>
              <button id="cancel-reply" class="text-zinc-500 hover:text-zinc-200 transition-colors p-1 rounded hover:bg-zinc-700/50 flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div id="chat-image-preview" class="hidden mb-3 relative inline-block">
              <img id="chat-preview-img" class="h-20 rounded-lg object-cover" alt="Preview">
              <button id="chat-remove-image" class="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-1 hover:bg-emerald-600">
                <i data-lucide="x" class="w-3 h-3"></i>
              </button>
            </div>
            <form id="send-message-form" class="flex gap-3 items-center">
              <label class="text-zinc-400 hover:text-zinc-100 cursor-pointer p-2 rounded-lg hover:bg-zinc-800 transition-colors flex-shrink-0">
                <i data-lucide="image" class="w-5 h-5"></i>
                <input type="file" id="chat-image-input" accept="image/jpeg,image/png,image/gif,image/webp" class="hidden">
              </label>
              <button type="button" id="chat-gif-btn" class="text-zinc-400 hover:text-zinc-100 p-2 rounded-lg hover:bg-zinc-800 transition-colors flex-shrink-0" title="Send GIF">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2"/><text x="12" y="16" text-anchor="middle" fill="currentColor" stroke="none" font-size="9" font-weight="bold">GIF</text></svg>
              </button>
              <input type="text" name="content" class="input flex-1 bg-zinc-800 border-zinc-700" placeholder="Type a message..." autocomplete="off" />
              <button type="submit" class="btn btn-primary p-2.5 rounded-lg">
                <i data-lucide="send" class="w-5 h-5"></i>
              </button>
            </form>
            <p id="chat-upload-error" class="text-emerald-400 text-xs mt-2 hidden"></p>
          </div>
        </div>
        
        <!-- THREADS PANEL -->
        <div id="panel-threads" class="hidden flex-1 flex-col min-w-0" style="min-height: 0; overflow: hidden;">
          <div class="p-3 border-b border-zinc-800 flex-shrink-0 flex items-center gap-2">
            <i data-lucide="git-branch" class="w-4 h-4 text-emerald-400"></i>
            <h3 class="text-sm font-bold text-zinc-200">Threads</h3>
          </div>
          <div id="threads-list" class="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2" style="-webkit-overflow-scrolling:touch;">
            <div class="flex items-center justify-center h-32 text-zinc-500 text-sm">
              <div class="text-center">
                <i data-lucide="git-branch" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
                <p>No threads yet</p>
                <p class="text-xs text-zinc-600 mt-1">Reply to a message to start a thread</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- RIGHT SIDEBAR: Members Panel -->
        <div id="panel-members" class="hidden md:flex w-full md:w-64 flex-shrink-0 border-l border-zinc-800 flex-col bg-zinc-900/50">
          ${(()=>{let u=f.filter(w=>!w.is_bot),h=f.filter(w=>w.is_bot),v=w=>`
              <div class="member-item flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors cursor-pointer" data-user-id="${w.id}">
                <div class="relative">
                  ${w.avatar?`
                    <img src="${w.avatar}" class="w-8 h-8 rounded-full object-cover border ${w.is_bot?"border-purple-500/50":"border-zinc-700"}">
                  `:`
                    <div class="w-8 h-8 rounded-full ${w.is_bot?"bg-purple-500/20 border-purple-500/30":"bg-gradient-to-br from-emerald-500/20 to-emerald-500/20 border-zinc-700"} flex items-center justify-center border">
                      ${w.is_bot?'<svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-1.5 4.5H6.5L5 14.5m14 0H5"/></svg>':`<span class="text-sm font-bold text-emerald-400">${(w.displayName||w.display_name||"?").charAt(0).toUpperCase()}</span>`}
                    </div>
                  `}
                  ${w.is_bot?'<div class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-purple-500 rounded-full flex items-center justify-center"><span class="text-[7px] font-bold text-white">B</span></div>':""}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-zinc-200 truncate">${this.escapeHtml(w.displayName||w.display_name||"Unknown")}${w.is_bot?' <span class="text-[9px] px-1 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full">BOT</span>':""}</p>
                  <p class="text-xs text-zinc-500">${w.is_bot?"\u{1F916} Bot":w.role==="owner"?"\u{1F451} Owner":w.role==="admin"?"\u26A1 Admin":"Member"}</p>
                </div>
              </div>
            `,y=window.location.origin+"/g/"+encodeURIComponent(a.slug);return`
              <div class="p-3 border-b border-zinc-800">
                <h3 class="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <i data-lucide="users" class="w-4 h-4"></i>
                  Members <span class="text-zinc-600">(${u.length+h.length})</span>
                </h3>
              </div>
              <div class="p-3 border-b border-zinc-800">
                <p class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <i data-lucide="link" class="w-3 h-3"></i>
                  Invite Link
                </p>
                <div class="flex items-center gap-1.5">
                  <input type="text" readonly value="${this.escapeHtml(y)}" class="flex-1 bg-zinc-800/50 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-mono select-all cursor-text min-w-0" id="invite-link-input">
                  <button id="copy-invite-link-btn" class="shrink-0 px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-medium transition-colors flex items-center gap-1" title="Copy invite link">
                    <i data-lucide="copy" class="w-3 h-3"></i>
                  </button>
                </div>
                <p class="text-[10px] text-zinc-600 mt-1.5">${a.privacy==="private"?"\u{1F512} Private \u2014 only share with trusted people":"Anyone with this link can join"}</p>
              </div>
              <div class="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                ${u.length===0&&h.length===0?'<p class="text-center text-zinc-600 text-sm py-4">No members yet</p>':""}
                ${u.map(v).join("")}
                ${h.length>0?`
                  <div class="pt-3 mt-2 border-t border-zinc-800">
                    <p class="text-[10px] font-bold text-purple-400 uppercase tracking-wider px-3 mb-1 flex items-center gap-1.5">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-1.5 4.5H6.5L5 14.5m14 0H5"/></svg>
                      Bots (${h.length})
                    </p>
                    ${h.map(v).join("")}
                  </div>
                `:""}
              </div>
            `})()}
        </div>
        
        <!-- Settings Modal -->
        <div id="group-settings-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm hidden items-center justify-center z-50">
          <div class="card max-w-lg w-full mx-4 slide-up max-h-[90vh] overflow-y-auto">
            <h2 class="text-xl font-bold text-zinc-100 mb-6 flex items-center gap-2">
              <i data-lucide="settings" class="w-5 h-5 text-emerald-400"></i>
              Group Settings
            </h2>
            <form id="group-settings-form" class="space-y-4">
              <div class="flex justify-center">
                <div class="relative">
                  <div id="edit-group-avatar-preview" style="width: 80px; height: 80px; border-radius: 16px; background: linear-gradient(135deg, #3f3f46, #27272a); display: flex; align-items: center; justify-content: center; cursor: pointer; border: 2px solid #10b981; transition: all 0.2s; overflow: hidden;">
                    ${a.avatar?`<img src="${a.avatar}" style="width: 100%; height: 100%; object-fit: cover;">`:`<span class="text-2xl font-bold text-emerald-400">${a.name.charAt(0).toUpperCase()}</span>`}
                  </div>
                  <input type="file" id="edit-group-avatar-input" accept="image/*" class="hidden">
                  <p class="text-xs text-zinc-500 text-center mt-2">Click to change</p>
                </div>
              </div>
              <input type="hidden" name="avatar" id="edit-group-avatar-url" value="${a.avatar||""}">
              <div>
                <label class="block text-sm font-medium text-zinc-300 mb-2">Name</label>
                <input type="text" name="name" class="input" value="${this.escapeHtml(a.name)}" required />
              </div>
              <div>
                <label class="block text-sm font-medium text-zinc-300 mb-2">Description</label>
                <textarea name="description" class="input resize-none" rows="3">${this.escapeHtml(a.description||"")}</textarea>
              </div>
              <div>
                <label class="block text-sm font-medium text-zinc-300 mb-2">Terms</label>
                <textarea name="terms" class="input resize-none" rows="2">${this.escapeHtml(a.terms||"")}</textarea>
              </div>
              <div class="flex gap-3 pt-2">
                <button type="button" id="cancel-group-settings" class="btn btn-secondary flex-1">Cancel</button>
                <button type="submit" class="btn btn-primary flex-1">Save</button>
              </div>
              <p id="group-settings-error" class="text-emerald-400 text-sm text-center hidden"></p>
            </form>

            ${a.privacy==="private"&&a.user_role==="owner"?`
            <div class="mt-6 pt-6 border-t border-zinc-700">
              <h3 class="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
                <i data-lucide="globe" class="w-4 h-4 text-emerald-400"></i>
                Convert to Public
              </h3>
              <p class="text-xs text-zinc-500 mb-3">Make this community publicly visible and browseable. This action cannot be undone \u2014 public communities cannot be made private again.</p>
              <div id="convert-public-section">
                <div class="space-y-3">
                  <div>
                    <label class="block text-xs font-medium text-zinc-400 mb-1">Custom Slug</label>
                    <input type="text" id="convert-slug-input" class="input font-mono text-sm" placeholder="my-community" pattern="[a-z0-9\\-]{3,30}" />
                    <p class="text-xs text-zinc-600 mt-1">3-30 lowercase letters, numbers, and hyphens. This becomes your shareable link: /g/your-slug</p>
                  </div>
                  <button type="button" id="convert-public-btn" class="btn w-full py-2.5 text-sm font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors rounded-lg">
                    <i data-lucide="globe" class="w-4 h-4 inline-block mr-1"></i>Convert to Public Community
                  </button>
                  <p id="convert-public-error" class="text-emerald-400 text-xs text-center hidden"></p>
                </div>
              </div>
            </div>
            `:""}

            <!-- Bot Management Section -->
            <div id="group-bot-management" class="mt-6 pt-6 border-t border-zinc-700">
              <h3 class="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
                <span class="text-pink-400">\u{1F916}</span> Bot Management
              </h3>
              <div id="group-bot-apps-container" class="space-y-2">
                <p class="text-xs text-zinc-500">Loading bot applications...</p>
              </div>
              <div id="group-approved-bots-container" class="mt-4 space-y-2">
              </div>
            </div>
          </div>
        </div>
      </div>
    `),window.lucide&&window.lucide.createIcons(),document.getElementById("copy-invite-link-btn")?.addEventListener("click",async()=>{let u=document.getElementById("invite-link-input");if(u)try{await navigator.clipboard.writeText(u.value);let h=document.getElementById("copy-invite-link-btn");h&&(h.innerHTML='<i data-lucide="check" class="w-3 h-3"></i>',h.classList.add("text-emerald-300","bg-emerald-500/30"),window.lucide&&window.lucide.createIcons(),setTimeout(()=>{h.innerHTML='<i data-lucide="copy" class="w-3 h-3"></i>',h.classList.remove("text-emerald-300","bg-emerald-500/30"),window.lucide&&window.lucide.createIcons()},2e3))}catch{u.select()}}),document.querySelectorAll(".mobile-tab").forEach(u=>{u.addEventListener("click",h=>{let v=h.currentTarget.dataset.tab,y=document.getElementById("panel-groups"),w=document.getElementById("panel-chat"),k=document.getElementById("panel-members"),S=document.getElementById("panel-threads");document.querySelectorAll(".mobile-tab").forEach(L=>{L.classList.remove("text-emerald-400","border-emerald-500"),L.classList.add("text-zinc-400","border-transparent")}),h.currentTarget.classList.remove("text-zinc-400","border-transparent"),h.currentTarget.classList.add("text-emerald-400","border-emerald-500"),y?.classList.add("hidden"),w?.classList.add("hidden"),k?.classList.add("hidden"),S?.classList.add("hidden"),y?.classList.remove("flex"),w?.classList.remove("flex"),k?.classList.remove("flex"),S?.classList.remove("flex"),v==="groups"?(y?.classList.remove("hidden"),y?.classList.add("flex")):v==="chat"?(w?.classList.remove("hidden"),w?.classList.add("flex")):v==="threads"?(S?.classList.remove("hidden"),S?.classList.add("flex"),this.loadThreadsList()):v==="members"&&(k?.classList.remove("hidden"),k?.classList.add("flex"))})}),document.querySelectorAll(".left-sidebar-tab").forEach(u=>{u.addEventListener("click",()=>{let h=u.dataset.tab;document.querySelectorAll(".left-sidebar-tab").forEach(w=>{w.classList.remove("text-emerald-400","border-emerald-500"),w.classList.add("text-zinc-500","border-transparent")}),u.classList.remove("text-zinc-500","border-transparent"),u.classList.add("text-emerald-400","border-emerald-500");let v=document.getElementById("left-tab-content-communities"),y=document.getElementById("left-tab-content-threads");h==="communities"?(v?.classList.remove("hidden"),y?.classList.add("hidden")):h==="threads"&&(v?.classList.add("hidden"),y?.classList.remove("hidden"),this.loadThreadsList())})}),document.getElementById("left-sidebar-collapse")?.addEventListener("click",()=>{let u=document.getElementById("panel-groups"),h=document.getElementById("left-sidebar-expand");u&&(u.classList.add("hidden"),u.classList.remove("md:flex")),h&&(h.classList.remove("hidden"),h.classList.add("flex"))}),document.getElementById("left-sidebar-expand-btn")?.addEventListener("click",()=>{let u=document.getElementById("panel-groups"),h=document.getElementById("left-sidebar-expand");u&&(u.classList.remove("hidden"),u.classList.add("md:flex")),h&&(h.classList.add("hidden"),h.classList.remove("flex"))}),document.getElementById("back-to-groups-list")?.addEventListener("click",()=>{this.disconnectGroupSocket(),this.showGroups()}),document.querySelectorAll(".group-nav-item").forEach(u=>{u.addEventListener("click",h=>{let v=h.currentTarget.dataset.groupId;v&&v!==e&&(this.disconnectGroupSocket(),this.openGroup(v))})}),document.querySelectorAll(".member-item").forEach(u=>{u.addEventListener("click",h=>{let v=h.currentTarget.dataset.userId;v&&this.viewUserProfile(v)})}),window.__scrollToMessage=u=>{let h=document.querySelector(`[data-msg-id="${u}"]`);h&&(h.scrollIntoView({behavior:"smooth",block:"center"}),h.classList.add("msg-highlight-pulse"),setTimeout(()=>h.classList.remove("msg-highlight-pulse"),1500))};let b=document.getElementById("messages-container");b&&(b.addEventListener("click",u=>{let h=u.target,v=h.closest(".reply-peek-bar");if(v){let y=v.dataset.scrollTo;y&&window.__scrollToMessage(y);return}if(h.classList.contains("chat-img-open")&&h.tagName==="IMG"){let y=h.src;y&&y.startsWith("https://i.ibb.co/")&&window.open(y,"_blank")}}),b.addEventListener("dblclick",u=>{let h=u.target.closest(".chat-msg-wrapper");if(h){let v=h.dataset.msgId||"",y=h.dataset.replyUserId||"",w=h.dataset.replySender||"",k=h.dataset.replyPreview||"";v&&y&&window.__replyToMessage(v,y,w,k)}})),window.__replyToMessage=(u,h,v,y)=>{this.replyingTo={messageId:u,userId:h,displayName:v,content:y};let w=document.getElementById("reply-preview"),k=document.getElementById("reply-to-name"),S=document.getElementById("reply-to-content");w&&k&&S&&(k.textContent=`Replying to ${v}`,S.textContent=y||"\u{1F4F7} Image",w.classList.remove("hidden"),w.style.animation="none",w.offsetHeight,w.style.animation="slideDown 0.15s ease-out");let L=document.querySelector('#send-message-form input[name="content"]');L&&L.focus()},document.getElementById("cancel-reply")?.addEventListener("click",()=>{this.replyingTo=null,document.getElementById("reply-preview")?.classList.add("hidden")}),document.getElementById("send-message-form")?.addEventListener("submit",async u=>{u.preventDefault(),await this.sendMessage()}),document.getElementById("chat-gif-btn")?.addEventListener("click",u=>{let h=u.currentTarget;this.openGifDrawer("group",h,{groupId:this.currentGroup?.id})}),document.getElementById("chat-image-input")?.addEventListener("change",u=>{let h=u.target;h.files&&h.files[0]&&this.handleChatImageSelect(h.files[0])}),document.getElementById("chat-remove-image")?.addEventListener("click",()=>this.clearChatImagePreview()),document.getElementById("group-members-manage-btn")?.addEventListener("click",()=>{this.showMembersPanel(e)}),document.getElementById("group-settings-btn")?.addEventListener("click",()=>{document.getElementById("group-settings-modal")?.classList.remove("hidden"),document.getElementById("group-settings-modal")?.classList.add("flex"),this.loadGroupBotManagement(e)}),document.getElementById("leave-group-btn")?.addEventListener("click",async()=>{if(!confirm("Are you sure you want to leave this group?"))return;let u=await fetch(`/api/groups/${e}/leave`,{method:"POST",headers:{"X-Auth-Hash":this.appState.hash||""}});if(u.ok)this.disconnectGroupSocket(),this.showGroups();else{let h=await u.json();alert(h.detail||"Failed to leave group")}}),document.getElementById("cancel-group-settings")?.addEventListener("click",()=>{document.getElementById("group-settings-modal")?.classList.add("hidden"),document.getElementById("group-settings-modal")?.classList.remove("flex")}),document.getElementById("convert-slug-input")?.addEventListener("input",()=>{document.getElementById("convert-public-error")?.classList.add("hidden")}),document.getElementById("convert-public-btn")?.addEventListener("click",async()=>{let u=document.getElementById("convert-slug-input"),h=document.getElementById("convert-public-error");if(!u||!h)return;let v=u.value.trim().toLowerCase();if(!v||v.length<3||v.length>30){h.textContent="Slug must be 3-30 characters",h.classList.remove("hidden");return}if(!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(v)&&v.length>2||!/^[a-z0-9-]+$/.test(v)){h.textContent="Only lowercase letters, numbers, and hyphens allowed",h.classList.remove("hidden");return}if(v.startsWith("dnprv-")){h.textContent="Slug cannot start with 'dnprv-' (reserved for private communities)",h.classList.remove("hidden");return}if(confirm("Convert this community to public? This cannot be undone."))try{let y=await fetch(`/api/groups/${e}/convert-public`,{method:"POST",headers:{"Content-Type":"application/json","X-Auth-Hash":this.appState.hash||""},body:JSON.stringify({slug:v})});if(y.ok)document.getElementById("group-settings-modal")?.classList.add("hidden"),document.getElementById("group-settings-modal")?.classList.remove("flex"),this.openGroup(e);else{let w=await y.json();h.textContent=w.detail||"Failed to convert",h.classList.remove("hidden")}}catch{h.textContent="Failed to convert",h.classList.remove("hidden")}}),document.getElementById("edit-group-avatar-preview")?.addEventListener("click",()=>{document.getElementById("edit-group-avatar-input")?.click()}),document.getElementById("edit-group-avatar-input")?.addEventListener("change",async u=>{let h=u.target.files?.[0];if(!h)return;let v=document.getElementById("edit-group-avatar-preview");v&&(v.innerHTML='<div class="animate-pulse w-full h-full bg-zinc-700"></div>');try{let y=new FormData;y.append("file",h);let w=await fetch("/api/upload/image",{method:"POST",headers:{"X-Auth-Hash":this.appState.hash||""},body:y});if(w.ok){let k=await w.json();document.getElementById("edit-group-avatar-url").value=k.url,v&&(v.innerHTML=`<img src="${k.url}" style="width: 100%; height: 100%; object-fit: cover;">`),D("Photo uploaded!","success")}else D("Failed to upload photo","error")}catch(y){console.error("Failed to upload avatar:",y),D("Failed to upload photo","error")}}),document.getElementById("group-settings-form")?.addEventListener("submit",async u=>{u.preventDefault(),await this.saveGroupSettings(e)}),this.connectGroupSocket(e),this.attachMsgReactionListeners(),this.loadThreadsList(),this.attachThreadBadgeListeners(),this.forceScrollBottom(()=>this.setupScrollPagination(e))}finally{this.isOpeningGroup=!1}}}async saveGroupSettings(e){let t=document.getElementById("group-settings-form"),s=new FormData(t),i=document.getElementById("group-settings-error");try{let a=await fetch(`/api/groups/${e}`,{method:"PATCH",headers:{"Content-Type":"application/json","X-Auth-Hash":this.appState.hash||""},body:JSON.stringify({name:s.get("name"),description:s.get("description"),terms:s.get("terms"),avatar:s.get("avatar")})});if(a.ok)document.getElementById("group-settings-modal")?.classList.add("hidden"),document.getElementById("group-settings-modal")?.classList.remove("flex"),this.openGroup(e);else{let n=await a.json();i&&(i.textContent=n.detail||"Failed to save settings",i.classList.remove("hidden"))}}catch{i&&(i.textContent="Failed to save settings",i.classList.remove("hidden"))}}async loadGroupBotManagement(e){let t=document.getElementById("group-bot-apps-container"),s=document.getElementById("group-approved-bots-container");if(!(!t||!s))try{let[i,a]=await Promise.all([fetch(`/api/groups/${e}/bot-applications`,{headers:{"X-Auth-Hash":this.appState.hash||""}}),fetch(`/api/groups/${e}/approved-bots`,{headers:{"X-Auth-Hash":this.appState.hash||""}})]),n=i.ok?await i.json():[],l=a.ok?await a.json():[];if(n.length===0&&l.length===0){t.innerHTML='<p class="text-xs text-zinc-500">No bot applications or approved bots for this group.</p>',s.innerHTML="";return}n.length>0?(t.innerHTML=`
          <p class="text-xs text-amber-400 font-medium mb-2">${n.length} Pending Application${n.length>1?"s":""}</p>
          ${n.map(o=>`
            <div class="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg" data-bot-group-app="${o.bot_id}">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-zinc-200">${this.escapeHtml(o.bot_name||"Unknown Bot")}</p>
                <p class="text-xs text-zinc-500 truncate">${this.escapeHtml(o.purpose||"No description")}</p>
              </div>
              <div class="flex gap-2 ml-3 flex-shrink-0">
                <button class="group-approve-bot-btn px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 text-xs font-bold rounded-lg transition-colors" data-bot-id="${o.bot_id}">Approve</button>
                <button class="group-reject-bot-btn px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 text-xs font-bold rounded-lg transition-colors" data-bot-id="${o.bot_id}">Reject</button>
              </div>
            </div>
          `).join("")}
        `,t.querySelectorAll(".group-approve-bot-btn").forEach(o=>{o.addEventListener("click",async()=>{let r=o.dataset.botId;if(!r)return;if((await fetch(`/api/groups/${e}/bot-applications/${r}/approve`,{method:"POST",headers:{"X-Auth-Hash":this.appState.hash||""}})).ok){C("Bot approved for this group!","success");let m=o.closest("[data-bot-group-app]");m&&(m.style.transition="all 0.3s ease",m.style.opacity="0",setTimeout(()=>m.remove(),300)),setTimeout(()=>this.loadGroupBotManagement(e),500)}else C("Failed to approve bot","error")})}),t.querySelectorAll(".group-reject-bot-btn").forEach(o=>{o.addEventListener("click",async()=>{let r=o.dataset.botId;if(!r)return;if((await fetch(`/api/groups/${e}/bot-applications/${r}/reject`,{method:"POST",headers:{"X-Auth-Hash":this.appState.hash||""}})).ok){C("Bot rejected","info");let m=o.closest("[data-bot-group-app]");m&&(m.style.transition="all 0.3s ease",m.style.opacity="0",setTimeout(()=>m.remove(),300)),setTimeout(()=>this.loadGroupBotManagement(e),500)}else C("Failed to reject bot","error")})})):t.innerHTML='<p class="text-xs text-zinc-500">No pending bot applications.</p>',l.length>0&&(s.innerHTML=`
          <p class="text-xs text-emerald-400 font-medium mb-2">${l.length} Approved Bot${l.length>1?"s":""}</p>
          ${l.map(o=>`
            <div class="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg" data-approved-bot="${o.id}">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-zinc-200">${this.escapeHtml(o.displayName||o.username||"Bot")}</p>
                <p class="text-xs text-zinc-500 truncate">${this.escapeHtml(o.purpose||"")}</p>
              </div>
              <button class="group-remove-bot-btn px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 text-xs font-bold rounded-lg transition-colors ml-3 flex-shrink-0" data-bot-id="${o.id}">Remove</button>
            </div>
          `).join("")}
        `,s.querySelectorAll(".group-remove-bot-btn").forEach(o=>{o.addEventListener("click",async()=>{let r=o.dataset.botId;if(!r||!confirm("Remove this bot from the group?"))return;if((await fetch(`/api/groups/${e}/bots/${r}/remove`,{method:"POST",headers:{"X-Auth-Hash":this.appState.hash||""}})).ok){C("Bot removed from group","info");let m=o.closest("[data-approved-bot]");m&&(m.style.transition="all 0.3s ease",m.style.opacity="0",setTimeout(()=>m.remove(),300))}else C("Failed to remove bot","error")})}))}catch{t.innerHTML='<p class="text-xs text-zinc-500">Could not load bot management data.</p>'}}renderMessages(){return this.groupMessages.length===0?`
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; opacity: 0.6;">
          <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(145deg, #1a1a1d, #0d0d0f); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);">
            <svg width="32" height="32" fill="none" stroke="#f87171" stroke-width="1.5" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
          </div>
          <p style="color: #52525b; font-size: 15px; margin: 0;">No messages yet</p>
          <p style="color: #3f3f46; font-size: 13px; margin: 4px 0 0 0;">Be the first to say something</p>
        </div>
      `:(this.hasMoreMessages?`
      <div id="load-more-trigger" style="display: flex; align-items: center; justify-content: center; padding: 16px; gap: 8px;">
        <div id="load-more-spinner" style="display: none; width: 20px; height: 20px; border: 2px solid #3f3f46; border-top-color: #10b981; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        <span style="color: #52525b; font-size: 12px;">Scroll up for older messages</span>
      </div>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    `:"")+this.groupMessages.map(t=>{let s=t.user_id===this.appState.user?.id,i=this.formatTimeLocal(t.created_at||t.timestamp),a=s?this.appState.user?.displayName||"You":t.author?.displayName||"Unknown",n=(t.content||"").substring(0,80),l=this.escapeHtml(t.id||""),o=this.escapeHtml(t.user_id||""),r=this.escapeHtml(a),c=this.escapeHtml(n),m=t.reply_to?(()=>{let f=this.escapeHtml(t.reply_to.author_name||"Unknown"),b=this.escapeHtml((t.reply_to.content_preview||"").substring(0,60));return`
          <div class="reply-peek-bar" data-scroll-to="${this.escapeHtml(t.reply_to.message_id||"")}" style="display: flex; align-items: center; gap: 6px; padding: 4px 10px; margin-bottom: 4px; border-radius: 8px; background: rgba(16,185,129,0.06); border-left: 2px solid #10b981; cursor: pointer; transition: all 0.2s; position: relative;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" style="flex-shrink:0; opacity: 0.7;"><path d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4"/></svg>
            <span style="font-size: 11px; font-weight: 600; color: #10b981; white-space: nowrap;">${f}</span>
            <span style="font-size: 11px; color: #a1a1aa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${b||"\u{1F4F7} Image"}</span>
            <div class="reply-flip-panel" style="display: none; position: absolute; bottom: calc(100% + 6px); left: 0; right: 0; z-index: 50; padding: 10px 12px; background: #1c1c20; border: 1px solid #3f3f46; border-radius: 10px; box-shadow: 0 -4px 20px rgba(0,0,0,0.5); animation: replyFlipUp 0.2s ease-out;">
              <div style="font-size: 11px; font-weight: 600; color: #10b981; margin-bottom: 3px;">${f}</div>
              <div style="font-size: 12px; color: #d4d4d8; line-height: 1.4; word-wrap: break-word;">${b||"\u{1F4F7} Image"}</div>
              <div style="position: absolute; bottom: -5px; left: 16px; width: 10px; height: 10px; background: #1c1c20; border-right: 1px solid #3f3f46; border-bottom: 1px solid #3f3f46; transform: rotate(45deg);"></div>
            </div>
          </div>`})():"";if(s)return`
          <div class="chat-msg-wrapper" data-msg-id="${l}" data-reply-user-id="${o}" data-reply-sender="${r}" data-reply-preview="${c}" style="display: flex; justify-content: flex-end; padding: 2px 0;" title="Double-click to reply">
            <div style="max-width: 70%; position: relative; cursor: default;">
              ${m}
              <div class="chat-bubble-reply" style="background: rgba(255, 255, 255, 0.95); color: #0f0f0f; padding: 10px 14px; border-radius: 18px 18px 4px 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.3); transition: all 0.15s; position: relative;">
                ${t.content?`<div style="font-size: 14px; line-height: 1.45; word-wrap: break-word; font-weight: 500;">${ge(t.content)}</div>`:""}
                ${t.image_url?`<img src="${this.escapeHtml(t.image_url)}" alt="Shared" class="chat-img-open" style="max-width: 100%; max-height: 200px; border-radius: 10px; margin-top: 8px; cursor: pointer; display: block;">`:""}
                <button class="msg-reaction-btn" data-msg-id="${l}" data-group-id="${this.currentGroup?.id||""}" style="position:absolute;bottom:-8px;right:4px;width:22px;height:22px;border-radius:50%;background:#27272a;border:1px solid #3f3f46;display:none;align-items:center;justify-content:center;cursor:pointer;font-size:12px;line-height:1;padding:0;z-index:5;">
                  <svg width="12" height="12" fill="none" stroke="#a1a1aa" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </button>
              </div>
              <div class="msg-reactions-display" data-msg-id="${l}" style="display:flex;flex-wrap:wrap;gap:3px;margin-top:2px;justify-content:flex-end;"></div>
              ${t.thread_reply_count?`
                <button class="thread-badge-btn" data-thread-root="${l}" style="display:flex;align-items:center;gap:4px;margin-top:4px;padding:4px 8px;border-radius:8px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);cursor:pointer;transition:all 0.2s;justify-content:flex-end;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M6 3v12"/><path d="M18 9a3 3 0 0 0-3-3H7"/><path d="M6 15a3 3 0 0 0 3 3h8"/></svg>
                  <span style="font-size:11px;color:#10b981;font-weight:600;">${t.thread_reply_count} ${t.thread_reply_count===1?"reply":"replies"}</span>
                  <span style="font-size:10px;color:#52525b;">\xB7 ${t.thread_last_reply_by||""}</span>
                </button>
              `:""}
              <div style="font-size: 10px; color: #71717a; text-align: right; margin-top: 3px; padding-right: 4px;">${i}</div>
            </div>
          </div>
        `;{let f=t.author?.displayName?.charAt(0).toUpperCase()||"?",b=["#f97316","#a855f7","#ec4899","#14b8a6","#facc15","#10b981","#3b82f6","#8b5cf6"],u=t.author?.displayName?.charCodeAt(0)%b.length||0,h=b[u];return`
          <div class="chat-msg-wrapper" data-msg-id="${l}" data-reply-user-id="${o}" data-reply-sender="${r}" data-reply-preview="${c}" style="display: flex; align-items: flex-end; gap: 8px; padding: 2px 0;" title="Double-click to reply">
            ${t.author?.avatar?`
              <img src="${t.author.avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.4); border: 2px solid #3f3f46;">
            `:`
              <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, ${h}, ${h}dd); display: flex; align-items: center; justify-content: center; color: white; font-size: 13px; font-weight: 700; flex-shrink: 0; box-shadow: 0 2px 8px ${h}66; border: 2px solid ${h};">
                ${f}
              </div>
            `}
            <div style="max-width: 70%; cursor: default;">
              <div style="font-size: 11px; font-weight: 600; color: ${h}; margin-bottom: 3px; margin-left: 2px;">${this.escapeHtml(t.author?.displayName||"Unknown")}</div>
              ${m}
              <div class="chat-bubble-reply" style="background: linear-gradient(135deg, #2a2a2e, #1f1f23); color: #fafafa; padding: 10px 14px; border-radius: 18px 18px 18px 4px; border: 1px solid #404045; box-shadow: 0 2px 6px rgba(0,0,0,0.25); transition: all 0.15s; position: relative;">
                ${t.content?`<div style="font-size: 14px; line-height: 1.45; word-wrap: break-word;">${ge(t.content)}</div>`:""}
                ${t.image_url?`<img src="${this.escapeHtml(t.image_url)}" alt="Shared" class="chat-img-open" style="max-width: 100%; max-height: 200px; border-radius: 10px; margin-top: 8px; cursor: pointer; display: block;">`:""}
                <button class="msg-reaction-btn" data-msg-id="${l}" data-group-id="${this.currentGroup?.id||""}" style="position:absolute;bottom:-8px;left:4px;width:22px;height:22px;border-radius:50%;background:#27272a;border:1px solid #3f3f46;display:none;align-items:center;justify-content:center;cursor:pointer;font-size:12px;line-height:1;padding:0;z-index:5;">
                  <svg width="12" height="12" fill="none" stroke="#a1a1aa" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </button>
              </div>
              <div class="msg-reactions-display" data-msg-id="${l}" style="display:flex;flex-wrap:wrap;gap:3px;margin-top:2px;margin-left:2px;"></div>
              ${t.thread_reply_count?`
                <button class="thread-badge-btn" data-thread-root="${l}" style="display:flex;align-items:center;gap:4px;margin-top:4px;padding:4px 8px;border-radius:8px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);cursor:pointer;transition:all 0.2s;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M6 3v12"/><path d="M18 9a3 3 0 0 0-3-3H7"/><path d="M6 15a3 3 0 0 0 3 3h8"/></svg>
                  <span style="font-size:11px;color:#10b981;font-weight:600;">${t.thread_reply_count} ${t.thread_reply_count===1?"reply":"replies"}</span>
                  <span style="font-size:10px;color:#52525b;">\xB7 ${t.thread_last_reply_by||""}</span>
                </button>
              `:""}
              <div style="font-size: 10px; color: #71717a; margin-top: 3px; margin-left: 2px;">${i}</div>
            </div>
          </div>
        `}}).join("")}renderGroupMessage(e){let t=e.user_id===this.appState.user?.id,s=this.formatTimeLocal(e.created_at||e.timestamp),i=t?this.appState.user?.displayName||"You":e.author?.displayName||"Unknown",a=(e.content||"").substring(0,80),n=this.escapeHtml(e.id||""),l=this.escapeHtml(e.user_id||""),o=this.escapeHtml(i),r=this.escapeHtml(a),c=e.reply_to?(()=>{let m=this.escapeHtml(e.reply_to.author_name||"Unknown"),f=this.escapeHtml((e.reply_to.content_preview||"").substring(0,60));return`
        <div class="reply-peek-bar" data-scroll-to="${this.escapeHtml(e.reply_to.message_id||"")}" style="display: flex; align-items: center; gap: 6px; padding: 4px 10px; margin-bottom: 4px; border-radius: 8px; background: rgba(16,185,129,0.06); border-left: 2px solid #10b981; cursor: pointer; transition: all 0.2s; position: relative;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" style="flex-shrink:0; opacity: 0.7;"><path d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4"/></svg>
          <span style="font-size: 11px; font-weight: 600; color: #10b981; white-space: nowrap;">${m}</span>
          <span style="font-size: 11px; color: #a1a1aa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${f||"\u{1F4F7} Image"}</span>
          <div class="reply-flip-panel" style="display: none; position: absolute; bottom: calc(100% + 6px); left: 0; right: 0; z-index: 50; padding: 10px 12px; background: #1c1c20; border: 1px solid #3f3f46; border-radius: 10px; box-shadow: 0 -4px 20px rgba(0,0,0,0.5); animation: replyFlipUp 0.2s ease-out;">
            <div style="font-size: 11px; font-weight: 600; color: #10b981; margin-bottom: 3px;">${m}</div>
            <div style="font-size: 12px; color: #d4d4d8; line-height: 1.4; word-wrap: break-word;">${f||"\u{1F4F7} Image"}</div>
            <div style="position: absolute; bottom: -5px; left: 16px; width: 10px; height: 10px; background: #1c1c20; border-right: 1px solid #3f3f46; border-bottom: 1px solid #3f3f46; transform: rotate(45deg);"></div>
          </div>
        </div>`})():"";if(t)return`
        <div class="chat-msg-wrapper" data-msg-id="${n}" data-reply-user-id="${l}" data-reply-sender="${o}" data-reply-preview="${r}" style="display: flex; justify-content: flex-end; padding: 2px 0;" title="Double-click to reply">
          <div style="max-width: 70%; position: relative; cursor: default;">
            ${c}
            <div class="chat-bubble-reply" style="background: rgba(255, 255, 255, 0.95); color: #0f0f0f; padding: 10px 14px; border-radius: 18px 18px 4px 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.3); transition: all 0.15s; position: relative;">
              ${e.content?`<div style="font-size: 14px; line-height: 1.45; word-wrap: break-word; font-weight: 500;">${ge(e.content)}</div>`:""}
              ${e.image_url?`<img src="${this.escapeHtml(e.image_url)}" alt="Shared" class="chat-img-open" style="max-width: 100%; max-height: 200px; border-radius: 10px; margin-top: 8px; cursor: pointer; display: block;">`:""}
              <button class="msg-reaction-btn" data-msg-id="${n}" data-group-id="${this.currentGroup?.id||""}" style="position:absolute;bottom:-8px;right:4px;width:22px;height:22px;border-radius:50%;background:#27272a;border:1px solid #3f3f46;display:none;align-items:center;justify-content:center;cursor:pointer;font-size:12px;line-height:1;padding:0;z-index:5;">
                <svg width="12" height="12" fill="none" stroke="#a1a1aa" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </button>
            </div>
            <div class="msg-reactions-display" data-msg-id="${n}" style="display:flex;flex-wrap:wrap;gap:3px;margin-top:2px;justify-content:flex-end;"></div>
            <div style="font-size: 10px; color: #71717a; text-align: right; margin-top: 3px; padding-right: 4px;">${s}</div>
          </div>
        </div>
      `;{let m=e.author?.displayName?.charAt(0).toUpperCase()||"?",f=["#f97316","#a855f7","#ec4899","#14b8a6","#facc15","#10b981","#3b82f6","#8b5cf6"],b=e.author?.displayName?.charCodeAt(0)%f.length||0,u=f[b];return`
        <div class="chat-msg-wrapper" data-msg-id="${n}" data-reply-user-id="${l}" data-reply-sender="${o}" data-reply-preview="${r}" style="display: flex; align-items: flex-end; gap: 8px; padding: 2px 0;" title="Double-click to reply">
          ${e.author?.avatar?`
            <img src="${e.author.avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.4); border: 2px solid #3f3f46;">
          `:`
            <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, ${u}, ${u}dd); display: flex; align-items: center; justify-content: center; color: white; font-size: 13px; font-weight: 700; flex-shrink: 0; box-shadow: 0 2px 8px ${u}66; border: 2px solid ${u};">
              ${m}
            </div>
          `}
          <div style="max-width: 70%; cursor: default;">
            <div style="font-size: 11px; font-weight: 600; color: ${u}; margin-bottom: 3px; margin-left: 2px;">${this.escapeHtml(e.author?.displayName||"Unknown")}</div>
            ${c}
            <div class="chat-bubble-reply" style="background: linear-gradient(135deg, #2a2a2e, #1f1f23); color: #fafafa; padding: 10px 14px; border-radius: 18px 18px 18px 4px; border: 1px solid #404045; box-shadow: 0 2px 6px rgba(0,0,0,0.25); transition: all 0.15s; position: relative;">
              ${e.content?`<div style="font-size: 14px; line-height: 1.45; word-wrap: break-word;">${ge(e.content)}</div>`:""}
              ${e.image_url?`<img src="${this.escapeHtml(e.image_url)}" alt="Shared" class="chat-img-open" style="max-width: 100%; max-height: 200px; border-radius: 10px; margin-top: 8px; cursor: pointer; display: block;">`:""}
              <button class="msg-reaction-btn" data-msg-id="${n}" data-group-id="${this.currentGroup?.id||""}" style="position:absolute;bottom:-8px;left:4px;width:22px;height:22px;border-radius:50%;background:#27272a;border:1px solid #3f3f46;display:none;align-items:center;justify-content:center;cursor:pointer;font-size:12px;line-height:1;padding:0;z-index:5;">
                <svg width="12" height="12" fill="none" stroke="#a1a1aa" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </button>
            </div>
            <div class="msg-reactions-display" data-msg-id="${n}" style="display:flex;flex-wrap:wrap;gap:3px;margin-top:2px;margin-left:2px;"></div>
            <div style="font-size: 10px; color: #71717a; margin-top: 3px; margin-left: 2px;">${s}</div>
          </div>
        </div>
      `}}async loadThreadsList(){if(!this.currentGroupId)return;let e=document.getElementById("threads-list"),t=document.getElementById("left-tab-content-threads");if(!(!e&&!t))try{let s=await fetch(`/api/groups/${this.currentGroupId}/threads`,{headers:{"X-Auth-Hash":this.appState.hash||""}});if(!s.ok)return;let i=await s.json(),n=`
        <div class="flex items-center justify-center h-32 text-zinc-500 text-sm">
          <div class="text-center">
            <i data-lucide="git-branch" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
            <p>No threads yet</p>
            <p class="text-xs text-zinc-600 mt-1">Reply to a message to start a thread</p>
          </div>
        </div>
      `;i.length&&(n=i.map(o=>{let r=this.formatTimeAgo(o.last_reply_at||o.created_at);return`
            <button class="thread-item w-full text-left p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/30 hover:bg-zinc-800/50 transition-all" data-thread-id="${this.escapeHtml(o.root_message_id)}">
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  ${o.root_author_avatar?`<img src="${o.root_author_avatar}" class="w-8 h-8 rounded-full object-cover">`:`<span class="text-sm font-bold text-emerald-400">${(o.root_author||"?").charAt(0).toUpperCase()}</span>`}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-0.5">
                    <span class="text-xs font-semibold text-zinc-300">${this.escapeHtml(o.root_author||"Unknown")}</span>
                    <span class="text-[10px] text-zinc-600">${r}</span>
                  </div>
                  <p class="text-sm text-zinc-400 truncate mb-1.5">${this.escapeHtml(o.root_content||"")}</p>
                  <div class="flex items-center gap-3">
                    <span class="text-xs text-emerald-400 font-medium flex items-center gap-1">
                      <i data-lucide="message-circle" class="w-3 h-3"></i>
                      ${o.reply_count||0} ${(o.reply_count||0)===1?"reply":"replies"}
                    </span>
                    <span class="text-[10px] text-zinc-600">Last reply by ${this.escapeHtml(o.last_reply_by||"Unknown")}</span>
                  </div>
                </div>
              </div>
            </button>
          `}).join("")),[e,t].filter(Boolean).forEach(o=>{o.innerHTML=n}),window.lucide&&window.lucide.createIcons(),document.querySelectorAll(".thread-item").forEach(o=>{o.addEventListener("click",r=>{let c=r.currentTarget.dataset.threadId;c&&this.openThreadView(c)})})}catch(s){console.error("Failed to load threads:",s)}}async openThreadView(e){if(this.currentGroupId){this.viewingThreadId=e;try{let t=await fetch(`/api/groups/${this.currentGroupId}/threads/${e}`,{headers:{"X-Auth-Hash":this.appState.hash||""}});if(!t.ok){this.viewingThreadId=null;return}let s=await t.json(),i=document.getElementById("panel-chat"),a=document.getElementById("panel-threads"),n=document.getElementById("panel-groups"),l=document.getElementById("panel-members");[a,n,l].forEach(u=>{u?.classList.add("hidden"),u?.classList.remove("flex")}),i?.classList.remove("hidden"),i?.classList.add("flex"),document.querySelectorAll(".mobile-tab").forEach(u=>{u.classList.remove("text-emerald-400","border-emerald-500"),u.classList.add("text-zinc-400","border-transparent")});let o=document.getElementById("messages-container");if(!o)return;let r=i?.querySelector(".group-header-epic");r&&(r.innerHTML=`
          <div class="relative px-4 py-3 flex items-center gap-3">
            <button id="back-from-thread" class="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800/50 transition-colors flex-shrink-0">
              <i data-lucide="arrow-left" class="w-5 h-5"></i>
            </button>
            <div class="flex-1 min-w-0">
              <h2 class="font-bold text-zinc-100 text-sm flex items-center gap-1.5">
                <i data-lucide="git-branch" class="w-4 h-4 text-emerald-400"></i>
                Thread
              </h2>
              <p class="text-xs text-zinc-500 truncate">${this.escapeHtml((s.root?.content||"").substring(0,60))}</p>
            </div>
            <span class="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">${(s.replies||[]).length} ${(s.replies||[]).length===1?"reply":"replies"}</span>
          </div>
        `);let c="";[s.root,...s.replies||[]].forEach((u,h)=>{if(!u)return;let v=h===0;c+=this.renderGroupMessage(u),v&&(s.replies||[]).length>0&&(c+=`
            <div class="flex items-center gap-3 py-2 px-2">
              <div class="flex-1 h-px bg-emerald-500/20"></div>
              <span class="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">${(s.replies||[]).length} ${(s.replies||[]).length===1?"reply":"replies"}</span>
              <div class="flex-1 h-px bg-emerald-500/20"></div>
            </div>
          `)}),o.innerHTML=c,window.lucide&&window.lucide.createIcons(),o.scrollTop=o.scrollHeight;let f=i?.querySelector('input[name="content"]');f&&(f.placeholder="Reply to thread..."),this.replyingTo={messageId:e,userId:s.root?.user_id||"",displayName:s.root?.author?.displayName||"Unknown",content:(s.root?.content||"").substring(0,80)};let b=document.getElementById("reply-preview");b&&b.classList.add("hidden"),document.getElementById("back-from-thread")?.addEventListener("click",()=>{this.exitThreadView()}),this.setupThreadMessageHandlers(o),this.attachMsgReactionListeners()}catch(t){console.error("Failed to open thread:",t),this.viewingThreadId=null}}}exitThreadView(){this.viewingThreadId=null,this.replyingTo=null,this.currentGroupId&&this.openGroup(this.currentGroupId,!0)}setupThreadMessageHandlers(e){e.querySelectorAll(".chat-msg-wrapper").forEach(t=>{t.addEventListener("dblclick",s=>{let i=s.currentTarget,a=i.dataset.msgId||"",n=i.dataset.replyUserId||"",l=i.dataset.replySender||"",o=i.dataset.replyPreview||"";a&&window.__replyToMessage&&window.__replyToMessage(a,n,l,o)})}),e.querySelectorAll(".reply-peek-bar").forEach(t=>{t.addEventListener("click",s=>{let a=s.currentTarget.dataset.scrollTo;a&&window.__scrollToMessage&&window.__scrollToMessage(a)})})}formatTimeAgo(e){try{let t=new Date(e),i=Math.floor((new Date().getTime()-t.getTime())/1e3);return i<60?"just now":i<3600?`${Math.floor(i/60)}m ago`:i<86400?`${Math.floor(i/3600)}h ago`:i<604800?`${Math.floor(i/86400)}d ago`:t.toLocaleDateString()}catch{return""}}pendingChatImageUrl=null;emojiDrawer={visible:!1,targetType:"post",targetId:"",pack:"twemoji",category:"",search:"",page:0,emoji:[],loading:!1,hasMore:!0,element:null};async handleChatImageSelect(e){let t=document.getElementById("chat-upload-error"),s=document.getElementById("chat-image-preview"),i=document.getElementById("chat-preview-img");if(!["image/jpeg","image/png","image/gif","image/webp"].includes(e.type)){t&&(t.textContent="Invalid file type. Use JPEG, PNG, GIF, or WebP.",t.classList.remove("hidden"));return}if(e.size>5*1024*1024){t&&(t.textContent="File too large. Maximum 5MB.",t.classList.remove("hidden"));return}t?.classList.add("hidden");let n=new FileReader;n.onload=l=>{i&&s&&(i.src=l.target?.result,s.classList.remove("hidden"))},n.readAsDataURL(e);try{let l=new FormData;l.append("file",e);let o=await fetch("/api/upload/image",{method:"POST",headers:{"X-Auth-Hash":this.appState.hash||""},body:l});if(o.ok){let r=await o.json();this.pendingChatImageUrl=r.url}else{let r=await o.json();throw new Error(r.detail||"Upload failed")}}catch(l){t&&(t.textContent=l.message||"Failed to upload image",t.classList.remove("hidden")),this.clearChatImagePreview()}}clearChatImagePreview(){this.pendingChatImageUrl=null,document.getElementById("chat-image-preview")?.classList.add("hidden");let e=document.getElementById("chat-image-input");e&&(e.value=""),document.getElementById("chat-upload-error")?.classList.add("hidden")}async sendMessage(){let t=document.getElementById("send-message-form").querySelector('input[name="content"]'),s=t.value.trim();if(!s&&!this.pendingChatImageUrl||!this.currentGroup)return;let i=null;if(this.replyingTo&&(i={message_id:this.replyingTo.messageId,author_name:this.replyingTo.displayName,content_preview:this.replyingTo.content},s&&!this.viewingThreadId)){let l=`@${this.replyingTo.displayName}`;s.toLowerCase().startsWith(l.toLowerCase())||(s=`${l} ${s}`)}if(this.viewingThreadId){let l={messageId:this.viewingThreadId,userId:this.replyingTo?.userId||"",displayName:this.replyingTo?.displayName||"Unknown",content:this.replyingTo?.content||""};this.replyingTo=null,document.getElementById("reply-preview")?.classList.add("hidden"),this.replyingTo=l}else this.replyingTo=null,document.getElementById("reply-preview")?.classList.add("hidden");t.value="";let a=this.pendingChatImageUrl;this.clearChatImagePreview();let n=await fetch(`/api/groups/${this.currentGroup.id}/messages`,{method:"POST",headers:{"Content-Type":"application/json","X-Auth-Hash":this.appState.hash||""},body:JSON.stringify({content:s,image_url:a,reply_to:i})});n.ok||console.error("Failed to send message:",n.status)}connectGroupSocket(e){this.disconnectGroupSocket();let s=`${window.location.protocol==="https:"?"wss:":"ws:"}//${window.location.host}/ws/group/${e}`;this.groupSocket=new WebSocket(s),this.groupSocket.onmessage=i=>{try{let a=JSON.parse(i.data);if(a.type==="new_message"){if(a.message?.thread_root_id&&this.viewingThreadId===a.message.thread_root_id){let n=document.getElementById("messages-container");if(n){let l=this.renderGroupMessage(a.message);n.insertAdjacentHTML("beforeend",l),window.lucide&&window.lucide.createIcons(),this.attachMsgReactionListeners(),n.scrollTop=n.scrollHeight}}else{this.groupMessages.push(a.message);let n=document.getElementById("messages-container");n&&(n.innerHTML=this.renderMessages(),this.attachMsgReactionListeners(),this.scrollToBottom())}if(a.message?.thread_root_id){let n=document.getElementById("panel-threads");n&&!n.classList.contains("hidden")&&this.loadThreadsList()}}else if(a.type==="reaction_update"&&a.target_type==="message"){let n=document.querySelector(`.msg-reactions-display[data-msg-id="${a.target_id}"]`);n&&this.renderReactionBadges(n,a.reactions,"message",a.target_id,a.group_id)}}catch(a){console.error("Failed to parse WebSocket message:",a)}}}disconnectGroupSocket(){this.groupSocket&&(this.groupSocket.close(),this.groupSocket=null),this.scrollObserver&&(this.scrollObserver.disconnect(),this.scrollObserver=null),this.isLoadingMore=!1}setupScrollPagination(e){this.scrollObserver&&(this.scrollObserver.disconnect(),this.scrollObserver=null),this.observeLoadMoreTrigger(e);let t=document.getElementById("load-more-trigger");t&&(t.style.cursor="pointer",t.addEventListener("click",()=>this.loadMoreMessages(e)))}observeLoadMoreTrigger(e){let t=document.getElementById("messages-container"),s=document.getElementById("load-more-trigger");!t||!s||(this.scrollObserver=new IntersectionObserver(i=>{for(let a of i)a.isIntersecting&&this.hasMoreMessages&&!this.isLoadingMore&&this.loadMoreMessages(e)},{root:t,threshold:.1}),this.scrollObserver.observe(s))}async loadMoreMessages(e){if(this.isLoadingMore||!this.hasMoreMessages||this.nextBefore===null)return;this.isLoadingMore=!0;let t=document.getElementById("load-more-spinner"),s=t?.parentElement?.querySelector("span");t&&(t.style.display="block"),s&&(s.textContent="Loading older messages...");try{let i=await fetch(`/api/groups/${e}/messages?before=${this.nextBefore}&limit=50`,{headers:{"X-Auth-Hash":this.appState.hash||""}});if(!i.ok)return;let a=await i.json(),n=Array.isArray(a.messages)?a.messages:[];if(this.hasMoreMessages=a.has_more||!1,this.nextBefore=a.next_before??null,n.length>0){let l=document.getElementById("messages-container");if(!l)return;let o=l.scrollHeight,r=l.scrollTop;this.groupMessages=[...n,...this.groupMessages],this.scrollObserver&&(this.scrollObserver.disconnect(),this.scrollObserver=null),l.innerHTML=this.renderMessages(),this.attachMsgReactionListeners();let c=l.scrollHeight;l.scrollTop=r+(c-o),this.hasMoreMessages&&this.observeLoadMoreTrigger(e)}}catch(i){console.error("Failed to load more messages:",i)}finally{this.isLoadingMore=!1;let i=document.getElementById("load-more-spinner");i&&(i.style.display="none")}}scrollToBottom(){let e=document.getElementById("messages-container");e&&(e.scrollTop=e.scrollHeight)}forceScrollBottom(e){let t=document.getElementById("messages-container");if(!t)return;let s=()=>{t.scrollTop=t.scrollHeight};s(),requestAnimationFrame(()=>{s(),requestAnimationFrame(()=>{s(),setTimeout(()=>{s(),e&&e()},200)})})}getFieldLabelFromUser(e){return{founder:"Founder",developer:"Developer",designer:"Designer",marketer:"Growth",product:"Product",freelancer:"Freelancer",software:"Developer",design:"Designer",marketing:"Marketer",data:"Data",devops:"DevOps",development:"Developer",other:"Builder"}[e.field]||e.field}async showMembersPanel(e,t="members"){let s=await fetch(`/api/groups/${e}/members`,{headers:{"X-Auth-Hash":this.appState.hash||""}});if(!s.ok){D("Failed to load members","error");return}let i=await s.json(),{members:a,my_role:n,is_superadmin:l}=i,o=l||i.is_admin||this.appState.user?.is_admin,r=n==="owner"||o,c=["owner","admin"].includes(n)||o,m=["owner","admin","moderator"].includes(n)||o,f=n==="owner"||o,b=[],u=[];if(f){let y=await fetch(`/api/groups/${e}/bot-applications`,{headers:{"X-Auth-Hash":this.appState.hash||""}});y.ok&&(b=await y.json());let w=await fetch(`/api/groups/${e}/approved-bots`,{headers:{"X-Auth-Hash":this.appState.hash||""}});w.ok&&(u=await w.json())}let h={owner:"bg-yellow-500/20 text-yellow-400 border-yellow-500/30",admin:"bg-emerald-500/20 text-emerald-400 border-emerald-500/30",moderator:"bg-blue-500/20 text-blue-400 border-blue-500/30",member:"bg-zinc-700/50 text-zinc-400 border-zinc-600/30"},v=document.createElement("div");v.className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4",v.id="members-modal",v.innerHTML=`
      <div class="bg-zinc-900 rounded-2xl border border-zinc-700 max-w-lg w-full max-h-[80vh] flex flex-col">
        <div class="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-zinc-100">Group Management</h2>
          <button id="close-members-modal" class="text-zinc-400 hover:text-zinc-100">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        ${f?`
        <div class="flex border-b border-zinc-800">
          <button class="members-tab flex-1 py-2 text-sm font-medium ${t==="members"?"text-emerald-400 border-b-2 border-emerald-400":"text-zinc-400 hover:text-zinc-200"}" data-tab="members">
            Members (${a.length})
          </button>
          <button class="members-tab flex-1 py-2 text-sm font-medium ${t==="bots"?"text-emerald-400 border-b-2 border-emerald-400":"text-zinc-400 hover:text-zinc-200"}" data-tab="bots">
            Bots ${b.length>0?`<span class="ml-1 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">${b.length}</span>`:`(${u.length})`}
          </button>
        </div>
        `:""}
        <div class="p-4 text-sm text-zinc-500 border-b border-zinc-800">
          Your role: <span class="font-medium ${h[n||"member"]?.split(" ")[1]||"text-zinc-400"}">${n||"member"}</span>
          ${o?' <span class="text-purple-400">(Platform Admin)</span>':""}
        </div>
        <div id="tab-members" class="flex-1 overflow-y-auto p-4 space-y-2 ${t!=="members"?"hidden":""}">
          ${(()=>{let y=a.filter(L=>!L.is_bot),w=a.filter(L=>L.is_bot),k=L=>`
              <div class="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                <div class="relative flex-shrink-0" style="width:40px;height:40px;">
                  ${L.avatar?`
                    <img src="${L.avatar}" alt="${L.displayName}" style="width:40px;height:40px;" class="rounded-full object-cover border ${L.is_bot?"border-purple-500/50":"border-zinc-600"}">
                  `:`
                    <div style="width:40px;height:40px;" class="rounded-full ${L.is_bot?"bg-purple-500/20":"bg-zinc-700"} flex items-center justify-center text-zinc-300 text-sm font-medium">
                      ${L.is_bot?'<svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-1.5 4.5H6.5L5 14.5m14 0H5"/></svg>':L.displayName.charAt(0).toUpperCase()}
                    </div>
                  `}
                  ${L.is_bot?'<div class="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center"><span class="text-[8px] font-bold text-white">B</span></div>':""}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-zinc-100 truncate">${this.escapeHtml(L.displayName)} ${L.is_bot?'<span class="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full ml-1">BOT</span>':""}</p>
                  <span class="text-xs px-2 py-0.5 rounded-full border ${h[L.role]||h.member}">
                    ${L.role}${L.is_banned?" (BANNED)":""}
                  </span>
                </div>
                ${L.id!==this.appState.user?.id&&!L.is_bot?`
                  <div class="flex items-center gap-1">
                    ${r&&L.role!=="owner"?`
                      <select class="role-select bg-zinc-700 border border-zinc-600 text-zinc-100 text-xs rounded px-2 py-1" data-user-id="${L.id}">
                        <option value="admin" ${L.role==="admin"?"selected":""}>Admin</option>
                        <option value="moderator" ${L.role==="moderator"?"selected":""}>Mod</option>
                        <option value="member" ${L.role==="member"?"selected":""}>Member</option>
                      </select>
                    `:""}
                    ${m&&L.role!=="owner"&&!L.is_banned?`
                      <button class="kick-btn text-orange-400 hover:text-orange-300 p-1" data-user-id="${L.id}" title="Kick">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"/>
                        </svg>
                      </button>
                    `:""}
                    ${c&&L.role!=="owner"?`
                      ${L.is_banned?`
                        <button class="unban-btn text-emerald-400 hover:text-emerald-300 p-1" data-user-id="${L.id}" title="Unban">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                        </button>
                      `:`
                        <button class="ban-btn text-emerald-400 hover:text-emerald-300 p-1" data-user-id="${L.id}" title="Ban">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                          </svg>
                        </button>
                      `}
                    `:""}
                  </div>
                `:""}
              </div>
            `,S="";return y.length>0&&(S+=`<div class="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2"><svg style="width:14px;height:14px;min-width:14px;min-height:14px;max-width:14px;max-height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>Members (${y.length})</div>`,S+=y.map(k).join("")),w.length>0&&(S+=`<div class="text-xs font-bold text-purple-400 uppercase tracking-wider mt-4 mb-2 flex items-center gap-2"><svg style="width:14px;height:14px;min-width:14px;min-height:14px;max-width:14px;max-height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-1.5 4.5H6.5L5 14.5m14 0H5"/></svg>Bots (${w.length})</div>`,S+=w.map(k).join("")),a.length===0&&(S='<p class="text-zinc-500 text-center py-4">No members yet</p>'),S})()}
        </div>
        ${f?`
        <div id="tab-bots" class="flex-1 overflow-y-auto p-4 space-y-4 ${t!=="bots"?"hidden":""}">
          ${b.length>0?`
            <div class="space-y-2">
              <h3 class="text-sm font-medium text-yellow-400 flex items-center gap-2">
                <span class="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                Pending Applications
              </h3>
              ${b.map(y=>`
                <div class="p-3 bg-zinc-800/50 rounded-xl border border-yellow-500/30">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg">
                      \u{1F916}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-zinc-100">${this.escapeHtml(y.bot_name)}</p>
                      <p class="text-xs text-zinc-400">@${this.escapeHtml(y.bot_username)}</p>
                    </div>
                  </div>
                  <p class="mt-2 text-sm text-zinc-400">${this.escapeHtml(y.bot_purpose||"No purpose specified")}</p>
                  <div class="mt-3 flex gap-2">
                    <button class="approve-bot-btn flex-1 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/30 transition-colors" data-bot-id="${y.bot_id}">
                      Approve
                    </button>
                    <button class="reject-bot-btn flex-1 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/30 transition-colors" data-bot-id="${y.bot_id}">
                      Reject
                    </button>
                  </div>
                </div>
              `).join("")}
            </div>
          `:""}
          
          <div class="space-y-2">
            <h3 class="text-sm font-medium text-emerald-400">Approved Bots (${u.length})</h3>
            ${u.length===0?'<p class="text-zinc-500 text-sm">No bots approved yet</p>':""}
            ${u.map(y=>`
              <div class="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-lg">
                  \u{1F916}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-zinc-100">${this.escapeHtml(y.displayName)}</p>
                  <p class="text-xs text-zinc-400">@${this.escapeHtml(y.username)}</p>
                </div>
                <button class="remove-bot-btn text-emerald-400 hover:text-emerald-300 p-2 hover:bg-emerald-500/10 rounded-lg transition-colors" data-bot-id="${y.id}" title="Remove bot">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            `).join("")}
          </div>
        </div>
        `:""}
      </div>
    `,document.body.appendChild(v),document.getElementById("close-members-modal")?.addEventListener("click",()=>v.remove()),v.addEventListener("click",y=>{y.target===v&&v.remove()}),v.querySelectorAll(".members-tab").forEach(y=>{y.addEventListener("click",w=>{let k=w.currentTarget.dataset.tab;v.remove(),this.showMembersPanel(e,k)})}),v.querySelectorAll(".approve-bot-btn").forEach(y=>{y.addEventListener("click",async w=>{let k=w.currentTarget.dataset.botId;(await fetch(`/api/groups/${e}/bot-applications/${k}/approve`,{method:"POST",headers:{"X-Auth-Hash":this.appState.hash||""}})).ok&&(D("Bot approved!","success"),v.remove(),this.showMembersPanel(e,"bots"))})}),v.querySelectorAll(".reject-bot-btn").forEach(y=>{y.addEventListener("click",async w=>{let k=w.currentTarget.dataset.botId;(await fetch(`/api/groups/${e}/bot-applications/${k}/reject`,{method:"POST",headers:{"X-Auth-Hash":this.appState.hash||""}})).ok&&(D("Bot rejected","info"),v.remove(),this.showMembersPanel(e,"bots"))})}),v.querySelectorAll(".remove-bot-btn").forEach(y=>{y.addEventListener("click",async w=>{let k=w.currentTarget.dataset.botId;confirm("Remove this bot from the group?")&&(await fetch(`/api/groups/${e}/bots/${k}/remove`,{method:"POST",headers:{"X-Auth-Hash":this.appState.hash||""}})).ok&&(D("Bot removed","info"),v.remove(),this.showMembersPanel(e,"bots"))})}),v.querySelectorAll(".role-select").forEach(y=>{y.addEventListener("change",async w=>{let k=w.target,S=k.dataset.userId,L=k.value;await this.setMemberRole(e,S,L)})}),v.querySelectorAll(".kick-btn").forEach(y=>{y.addEventListener("click",async w=>{let k=w.currentTarget.dataset.userId;confirm("Kick this member from the group?")&&(await this.kickMember(e,k),v.remove(),this.showMembersPanel(e))})}),v.querySelectorAll(".ban-btn").forEach(y=>{y.addEventListener("click",async w=>{let k=w.currentTarget.dataset.userId;confirm("Ban this member? They won't be able to rejoin.")&&(await this.banMember(e,k),v.remove(),this.showMembersPanel(e))})}),v.querySelectorAll(".unban-btn").forEach(y=>{y.addEventListener("click",async w=>{let k=w.currentTarget.dataset.userId;await this.unbanMember(e,k),v.remove(),this.showMembersPanel(e)})})}async setMemberRole(e,t,s){let i=await fetch(`/api/groups/${e}/roles`,{method:"POST",headers:{"Content-Type":"application/json","X-Auth-Hash":this.appState.hash||""},body:JSON.stringify({user_id:t,role:s})});if(!i.ok){let a=await i.json();D(a.detail||"Failed to update role","error")}}async kickMember(e,t){let s=await fetch(`/api/groups/${e}/kick`,{method:"POST",headers:{"Content-Type":"application/json","X-Auth-Hash":this.appState.hash||""},body:JSON.stringify({user_id:t})});if(!s.ok){let i=await s.json();D(i.detail||"Failed to kick member","error")}}async banMember(e,t){let s=await fetch(`/api/groups/${e}/ban`,{method:"POST",headers:{"Content-Type":"application/json","X-Auth-Hash":this.appState.hash||""},body:JSON.stringify({user_id:t})});if(!s.ok){let i=await s.json();D(i.detail||"Failed to ban member","error")}}async unbanMember(e,t){let s=await fetch(`/api/groups/${e}/unban`,{method:"POST",headers:{"Content-Type":"application/json","X-Auth-Hash":this.appState.hash||""},body:JSON.stringify({user_id:t})});if(!s.ok){let i=await s.json();D(i.detail||"Failed to unban member","error")}}parseTimestamp(e){if(!e)return new Date;try{let t=e;!t.endsWith("Z")&&!t.includes("+")&&t.indexOf("-",10)===-1&&(t+="Z");let s=new Date(t);return isNaN(s.getTime())?new Date:s}catch{return new Date}}formatTime(e){let t=this.parseTimestamp(e),i=new Date().getTime()-t.getTime(),a=Math.floor(i/6e4);if(a<1)return"just now";if(a<60)return`${a}m ago`;let n=Math.floor(a/60);if(n<24)return`${n}h ago`;let l=Math.floor(n/24);return l<7?`${l}d ago`:t.toLocaleDateString()}formatTimeLocal(e){return this.parseTimestamp(e).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}formatDateTimeLocal(e){let t=this.parseTimestamp(e),s=new Date,i=t.toDateString()===s.toDateString(),a=new Date(s);a.setDate(a.getDate()-1);let n=t.toDateString()===a.toDateString(),l=t.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});return i?l:n?`Yesterday ${l}`:`${t.toLocaleDateString()} ${l}`}renderGroupDetail(e){return`
      <div class="panel-header border-b border-zinc-800">
        <div class="flex items-center gap-3">
          ${e.avatar?`
            <img src="${e.avatar}" alt="${e.name}" class="w-10 h-10 rounded-lg object-cover" />
          `:`
            <div class="w-10 h-10 rounded-lg ${e.status==="pending"?"bg-amber-500/20":"bg-emerald-500/20"} flex items-center justify-center">
              <span class="text-lg font-bold ${e.status==="pending"?"text-amber-400":"text-emerald-400"}">${e.name.charAt(0).toUpperCase()}</span>
            </div>
          `}
          <div>
            <h2 class="font-semibold text-zinc-100">${this.escapeHtml(e.name)}</h2>
            <p class="text-xs text-zinc-500">${e.status==="pending"?"Awaiting Approval":`${e.member_count||0} members`}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          ${e.status==="pending"?`
            <span class="text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-1.5">In Moderation</span>
          `:e.is_member?`
            <button id="open-group-chat-btn" class="btn btn-primary text-xs py-1.5 px-3" data-group-id="${e.id}">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
              Open Chat
            </button>
          `:`
            <button id="join-group-detail-btn" class="btn btn-primary text-xs py-1.5 px-3" data-group-id="${e.id}">Join Group</button>
          `}
        </div>
      </div>
      <div class="panel-body p-6 flex-1 overflow-y-auto">
        <div class="space-y-6">
          ${e.description?`
            <div>
              <h3 class="text-sm font-medium text-zinc-400 mb-2">About</h3>
              <p class="text-zinc-300">${this.escapeHtml(e.description)}</p>
            </div>
          `:""}
          ${e.terms?`
            <div>
              <h3 class="text-sm font-medium text-zinc-400 mb-2">Terms</h3>
              <p class="text-zinc-300 text-sm">${this.escapeHtml(e.terms)}</p>
            </div>
          `:""}
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-zinc-800/50 rounded-lg p-4">
              <p class="text-2xl font-bold text-emerald-400">${e.member_count||0}</p>
              <p class="text-xs text-zinc-500">Members</p>
            </div>
            <div class="bg-zinc-800/50 rounded-lg p-4">
              <p class="text-2xl font-bold text-zinc-300">${e.slug||"N/A"}</p>
              <p class="text-xs text-zinc-500">Slug</p>
            </div>
          </div>
        </div>
      </div>
    `}gifDrawerCleanup=null;async openGifDrawer(e,t,s){let i=document.getElementById("gif-drawer-popup");if(i){i.remove(),this.gifDrawerCleanup&&(this.gifDrawerCleanup(),this.gifDrawerCleanup=null);return}let a=document.createElement("div");a.id="gif-drawer-popup",a.style.cssText=`
      position: fixed; z-index: 9999; width: 460px; bottom: 60px; top: 60px;
      background: #18181b; border: 1px solid #3f3f46; border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.6); display: flex; flex-direction: column;
      overflow: hidden; animation: gifDrawerIn 0.2s ease-out;
    `;let n=document.createElement("style");n.textContent=`
      @keyframes gifDrawerIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      #gif-drawer-popup .gif-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 6px; align-content: start; }
      #gif-drawer-popup .gif-item { cursor: pointer; border-radius: 8px; overflow: hidden; position: relative; background: #27272a; }
      #gif-drawer-popup .gif-item:hover { outline: 2px solid #10b981; }
      #gif-drawer-popup .gif-item img { width: 100%; height: auto; display: block; }
      #gif-drawer-popup .gif-search { background: #27272a; border: 1px solid #3f3f46; color: #fafafa; padding: 8px 12px; border-radius: 8px; width: 100%; font-size: 13px; outline: none; }
      #gif-drawer-popup .gif-search:focus { border-color: #10b981; }
      #gif-drawer-popup .gif-search::placeholder { color: #71717a; }
      #gif-drawer-popup .gif-loading { display: flex; align-items: center; justify-content: center; padding: 32px; color: #71717a; font-size: 13px; }
    `,a.appendChild(n),a.innerHTML+=`
      <div style="padding: 10px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #3f3f46; flex-shrink: 0;">
        <input type="text" class="gif-search" placeholder="Search GIFs..." id="gif-search-input" style="flex:1;">
        <button id="gif-close-btn" style="background: none; border: none; color: #a1a1aa; cursor: pointer; font-size: 20px; line-height: 1; padding: 4px 8px; border-radius: 6px; flex-shrink: 0;">&times;</button>
      </div>
      <div id="gif-scroll-wrap" style="flex: 1; overflow-y: auto; min-height: 0;">
        <div class="gif-grid" id="gif-grid">
          <div class="gif-loading" style="grid-column: 1/-1;">Loading trending GIFs...</div>
        </div>
      </div>
      <div style="padding: 6px 10px; text-align: center; border-top: 1px solid #3f3f46; flex-shrink: 0;">
        <span style="color: #52525b; font-size: 11px;">Powered by <span style="color: #10b981; font-weight: 600;">KLIPY</span></span>
      </div>
    `,document.body.appendChild(a);let o=t.getBoundingClientRect().left;o+460>window.innerWidth&&(o=window.innerWidth-468),o<8&&(o=8),a.style.left=o+"px";let r=document.getElementById("gif-grid"),c=document.getElementById("gif-search-input"),m=null,f=[],b=0,u="",h=1,v=!1,y=!0,w=8,k=(z,g=!1)=>{g||(r.innerHTML=""),z.forEach(T=>{let $=document.createElement("div");$.className="gif-item",$.title=this.escapeHtml(T.title||"");let F=document.createElement("img");F.src=T.preview_url||T.url,F.alt=this.escapeHtml(T.title||"GIF"),F.loading="lazy",$.appendChild(F),$.addEventListener("click",()=>{this.handleGifSelect(e,T.url,s),V()}),r.appendChild($)})},S=()=>{if(v)return;let z=f.slice(b,b+w);z.length>0&&(k(z,!0),b+=z.length),b>=f.length&&y&&(v=!0,h++,L(u,h,!0))},L=async(z,g,T=!1)=>{T||(r.innerHTML='<div class="gif-loading" style="grid-column: 1/-1;">Searching...</div>');try{let $=new URLSearchParams({q:z,page:String(g)}),F=await fetch(`/api/gifs?${$.toString()}`,{headers:{"X-Auth-Hash":this.appState.hash||""}});if(!F.ok)throw new Error("Failed");let Q=await F.json();if(!Q.length&&!T){r.innerHTML='<div class="gif-loading" style="grid-column: 1/-1;">No GIFs found</div>',y=!1;return}if(Q.length===0){y=!1,v=!1;return}T?f=f.concat(Q):(f=Q,b=0),y=Q.length>=10,v=!1;let fe=f.slice(b,b+w);k(fe,T),b+=fe.length}catch{T||(r.innerHTML='<div class="gif-loading" style="grid-column: 1/-1;">Failed to load GIFs</div>'),v=!1}},ae=document.getElementById("gif-scroll-wrap");ae.addEventListener("scroll",()=>{ae.scrollTop+ae.clientHeight>=ae.scrollHeight-50&&S()});let le=z=>{u=z,h=1,f=[],b=0,y=!0,v=!1,L(z,1,!1)};c.addEventListener("input",()=>{m&&clearTimeout(m),m=setTimeout(()=>le(c.value.trim()),300)});let V=()=>{let z=document.getElementById("gif-drawer-popup");z&&z.remove(),this.gifDrawerCleanup&&(this.gifDrawerCleanup(),this.gifDrawerCleanup=null)};document.getElementById("gif-close-btn").addEventListener("click",z=>{z.stopPropagation(),V()});let de=z=>{!a.contains(z.target)&&z.target!==t&&V()},Z=z=>{z.key==="Escape"&&V()};setTimeout(()=>document.addEventListener("click",de),10),document.addEventListener("keydown",Z),this.gifDrawerCleanup=()=>{document.removeEventListener("click",de),document.removeEventListener("keydown",Z),m&&clearTimeout(m)},le(""),c.focus()}handleGifSelect(e,t,s){if(e==="post"){this.pendingImageUrl=t;let i=document.getElementById("image-preview"),a=document.getElementById("image-preview-container");i&&a&&(i.src=t,a.classList.remove("hidden"))}else if(e==="group"){this.pendingChatImageUrl=t;let i=document.getElementById("chat-preview-img"),a=document.getElementById("chat-image-preview");i&&a&&(i.src=t,a.classList.remove("hidden"))}else if(e==="dm"){s?.setPendingImage&&s.setPendingImage(t);let i=document.getElementById("dm-image-preview-img"),a=document.getElementById("dm-image-preview");i&&a&&(i.src=t,a.classList.remove("hidden"))}}async loadUserEcosystems(){let e=await fetch("/api/ecosystems",{headers:{"X-Auth-Hash":this.appState.hash||""}});this.userEcosystems=e.ok?await e.json():[],this.userEcosystems.length>0&&!this.activeEcosystem&&(this.activeEcosystem=this.userEcosystems[0]),this.activeEcosystem&&this.applyEcosystemColors(this.activeEcosystem),this.renderEcosystemSwitcher(),this.updateAdminNavVisibility()}updateAdminNavVisibility(){let e=this.appState.user;if(!e)return;let t=document.getElementById("nav-admin");if(!t)return;let s=e.is_admin||e.is_superadmin,i=this.activeEcosystem&&this.userEcosystems.find(a=>a.id===this.activeEcosystem?.id&&a.user_role==="admin");s||i?t.classList.remove("hidden"):t.classList.add("hidden")}renderEcosystemSwitcher(){let e=document.getElementById("ecosystem-list"),t=document.getElementById("ecosystem-switcher");!e||!t||(t.classList.remove("hidden"),e.innerHTML=this.userEcosystems.map(s=>`
      <button class="eco-switch-btn sidebar-btn ${this.activeEcosystem?.id===s.id?"active":""}"
              data-eco-id="${s.id}" title="${this.escapeHtml(s.name)}">
        ${s.icon?`<img src="${s.icon}" class="w-5 h-5 rounded flex-shrink-0" alt="">`:`<div class="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
               style="background-color: ${s.accent_color||"#10b981"}">${s.name.charAt(0).toUpperCase()}</div>`}
        <span class="sidebar-label truncate">${this.escapeHtml(s.name)}</span>
      </button>
    `).join(""),e.querySelectorAll(".eco-switch-btn").forEach(s=>{s.addEventListener("click",()=>{let i=s.dataset.ecoId,a=this.userEcosystems.find(n=>n.id===i);a&&this.switchEcosystem(a)})}),document.getElementById("eco-explore-btn")?.addEventListener("click",()=>this.showEcosystemExplore()),window.lucide&&window.lucide.createIcons())}switchEcosystem(e){this.activeEcosystem=e,this.applyEcosystemColors(e),this.renderEcosystemSwitcher(),this.updateAdminNavVisibility(),this.showGroups()}applyEcosystemColors(e){if(!e)return;let t=e.accent_color||"#10b981",s=e.secondary_color||"#6366f1",i=document.documentElement;i.style.setProperty("--eco-accent",t),i.style.setProperty("--eco-accent-rgb",this.hexToRgb(t)),i.style.setProperty("--eco-secondary",s),i.style.setProperty("--eco-secondary-rgb",this.hexToRgb(s))}hexToRgb(e){let t=e.replace("#","");if(t.length===3&&(t=t[0]+t[0]+t[1]+t[1]+t[2]+t[2]),!/^[0-9a-fA-F]{6}$/.test(t))return"16, 185, 129";let s=parseInt(t.substring(0,2),16),i=parseInt(t.substring(2,4),16),a=parseInt(t.substring(4,6),16);return`${s}, ${i}, ${a}`}showCreateEcosystem(){let e=[{name:"Emerald",value:"#10b981"},{name:"Red",value:"#ef4444"},{name:"Blue",value:"#3b82f6"},{name:"Purple",value:"#8b5cf6"},{name:"Amber",value:"#f59e0b"},{name:"Cyan",value:"#06b6d4"},{name:"Pink",value:"#ec4899"}];this.setContent(`
      <div class="h-full w-full flex flex-col">
        <div class="panel flex-1">
          <div class="panel-header">
            <div class="flex items-center gap-3">
              <button id="eco-back-btn" class="text-zinc-400 hover:text-zinc-100 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <span class="panel-title">Create Ecosystem</span>
            </div>
          </div>
          <div class="panel-body p-4">
            <form id="create-eco-form" class="max-w-lg mx-auto space-y-4">
              <div>
                <label class="text-xs text-zinc-400 mb-1 block">Name</label>
                <input type="text" name="name" required maxlength="50" placeholder="My Ecosystem" class="input text-sm w-full">
              </div>
              <div>
                <label class="text-xs text-zinc-400 mb-1 block">Slug</label>
                <input type="text" name="slug" required maxlength="30" placeholder="my-ecosystem" class="input text-sm w-full" pattern="[a-z0-9\\-]+">
                <p class="text-[10px] text-zinc-600 mt-1">Lowercase letters, numbers, and hyphens only</p>
              </div>
              <div>
                <label class="text-xs text-zinc-400 mb-1 block">Description</label>
                <textarea name="description" rows="3" maxlength="500" placeholder="What is this ecosystem about?" class="input text-sm w-full resize-none"></textarea>
              </div>
              <div>
                <label class="text-xs text-zinc-400 mb-2 block">Accent Color</label>
                <div class="flex gap-2 flex-wrap" id="color-picker">
                  ${e.map((i,a)=>`
                    <button type="button" class="color-swatch w-8 h-8 rounded-lg border-2 transition-all ${a===0?"border-white scale-110":"border-transparent hover:border-zinc-500"}" 
                            data-color="${i.value}" style="background-color: ${i.value}" title="${i.name}"></button>
                  `).join("")}
                </div>
                <input type="hidden" name="accent_color" value="${e[0].value}">
              </div>
              <div>
                <label class="text-xs text-zinc-400 mb-2 block">Icon</label>
                <div class="flex items-center gap-4">
                  <div id="eco-icon-preview" class="w-16 h-16 rounded-xl bg-zinc-800 border-2 border-dashed border-zinc-600 hover:border-emerald-500 flex items-center justify-center cursor-pointer transition-all overflow-hidden flex-shrink-0" title="Click to upload icon">
                    <div class="text-center">
                      <i data-lucide="image-plus" class="w-5 h-5 text-zinc-500 mx-auto"></i>
                      <p class="text-[9px] text-zinc-600 mt-0.5">Upload</p>
                    </div>
                  </div>
                  <div class="flex-1">
                    <p class="text-[11px] text-zinc-500">Click to upload an icon for your ecosystem. Square images work best.</p>
                    <p id="eco-icon-status" class="text-[11px] text-emerald-400 mt-1 hidden"></p>
                  </div>
                </div>
                <input type="file" id="eco-icon-input" accept="image/jpeg,image/png,image/gif,image/webp" class="hidden">
                <input type="hidden" name="icon" id="eco-icon-url" value="">
              </div>
              <div id="eco-create-error" class="text-red-400 text-xs hidden"></div>
              <button type="submit" class="btn btn-primary w-full py-2.5">Create Ecosystem</button>
            </form>
          </div>
        </div>
      </div>
    `),document.getElementById("eco-back-btn")?.addEventListener("click",()=>this.showExplore());let t=document.querySelector('#create-eco-form input[name="name"]'),s=document.querySelector('#create-eco-form input[name="slug"]');t&&s&&(t.addEventListener("input",()=>{s.dataset.manual||(s.value=t.value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""))}),s.addEventListener("input",()=>{s.dataset.manual="1"})),document.querySelectorAll(".color-swatch").forEach(i=>{i.addEventListener("click",()=>{document.querySelectorAll(".color-swatch").forEach(n=>{n.classList.remove("border-white","scale-110"),n.classList.add("border-transparent")}),i.classList.add("border-white","scale-110"),i.classList.remove("border-transparent");let a=document.querySelector('#create-eco-form input[name="accent_color"]');a&&(a.value=i.dataset.color||"")})}),document.getElementById("eco-icon-preview")?.addEventListener("click",()=>{document.getElementById("eco-icon-input")?.click()}),document.getElementById("eco-icon-input")?.addEventListener("change",async i=>{let a=i.target.files?.[0];if(!a)return;let n=document.getElementById("eco-icon-preview"),l=document.getElementById("eco-icon-status");n&&(n.innerHTML='<div class="animate-pulse w-full h-full bg-zinc-700 rounded-xl"></div>');try{let o=new FormData;o.append("file",a);let r=await fetch("/api/upload/image",{method:"POST",headers:{"X-Auth-Hash":this.appState.hash||""},body:o});if(r.ok){let c=await r.json();document.getElementById("eco-icon-url").value=c.url,n&&(n.innerHTML=`<img src="${c.url}" class="w-full h-full object-cover">`,n.classList.remove("border-dashed","border-zinc-600"),n.classList.add("border-solid","border-emerald-500")),l&&(l.textContent="Icon uploaded",l.classList.remove("hidden"))}else n&&(n.innerHTML='<div class="text-center"><i data-lucide="image-plus" class="w-5 h-5 text-red-400 mx-auto"></i><p class="text-[9px] text-red-400 mt-0.5">Failed</p></div>',window.lucide&&window.lucide.createIcons()),C("Failed to upload icon","error")}catch{C("Failed to upload icon","error")}}),document.getElementById("create-eco-form")?.addEventListener("submit",async i=>{i.preventDefault();let a=i.target,n=new FormData(a),l=document.getElementById("eco-create-error");l.classList.add("hidden");try{let o=await fetch("/api/ecosystems",{method:"POST",headers:{"Content-Type":"application/json","X-Auth-Hash":this.appState.hash||""},body:JSON.stringify({name:n.get("name"),slug:n.get("slug"),description:n.get("description"),accent_color:n.get("accent_color"),icon:n.get("icon")||""})});if(o.ok){let r=await o.json();if(await this.loadUserEcosystems(),r.id){let c=this.userEcosystems.find(m=>m.id===r.id);c?this.switchEcosystem(c):this.showExplore()}else this.showExplore();C("Ecosystem created!","success")}else{let r=await o.json().catch(()=>({detail:"Failed to create ecosystem"}));l.textContent=r.detail||"Failed to create ecosystem",l.classList.remove("hidden")}}catch{l.textContent="Failed to create ecosystem",l.classList.remove("hidden")}})}escapeHtml(e){let t=document.createElement("div");return t.textContent=e,t.innerHTML}parseMarkdown(e){return ge(e)}parseMarkdownPreview(e){let t=ge(e),s=document.createElement("div");return s.innerHTML=t,s.textContent||s.innerText||e}isWithinEditWindow(e){return(Date.now()-new Date(e).getTime())/1e3<=180}isWithinDeleteWindow(e){return(Date.now()-new Date(e).getTime())/1e3<=60}getRemainingTime(e,t){let s=(Date.now()-new Date(e).getTime())/1e3,i=Math.max(0,t-s);if(i<=0)return"expired";let a=Math.floor(i/60),n=Math.floor(i%60);return a>0?`${a}m ${n}s left`:`${n}s left`}async editPost(e,t){let s=prompt("Edit your post:",t);if(!(s===null||s.trim()===t.trim()))try{let i=await fetch(`/api/posts/${e}`,{method:"PUT",headers:{"Content-Type":"application/json","X-Auth-Hash":this.appState.hash||""},body:JSON.stringify({content:s.trim()})});if(!i.ok){let a=await i.json();D(a.detail||"Failed to edit post","error");return}this.loadFeed()}catch(i){console.error("Edit error:",i),D("Failed to edit post","error")}}async deletePost(e){if(confirm("Delete this post? This cannot be undone."))try{let t=await fetch(`/api/posts/${e}`,{method:"DELETE",headers:{"X-Auth-Hash":this.appState.hash||""}});if(!t.ok){let i=await t.json();D(i.detail||"Failed to delete post","error");return}let s=document.querySelector(`[data-post-id="${e}"]`);s&&s.remove()}catch(t){console.error("Delete error:",t),D("Failed to delete post","error")}}async openEmojiDrawer(e,t,s,i){if(this.emojiDrawer.visible&&this.emojiDrawer.targetId===t&&this.emojiDrawer.targetType===e){this.closeEmojiDrawer();return}this.closeEmojiDrawer(),this.emojiDrawer.visible=!0,this.emojiDrawer.targetType=e,this.emojiDrawer.targetId=t,this.emojiDrawer.groupId=i,this.emojiDrawer.pack="twemoji",this.emojiDrawer.category="",this.emojiDrawer.search="",this.emojiDrawer.page=0,this.emojiDrawer.emoji=[],this.emojiDrawer.hasMore=!0;let a=document.createElement("div");a.id="emoji-drawer",a.style.cssText="position:absolute;z-index:9999;width:300px;background:#18181b;border:1px solid #3f3f46;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5);padding:8px;",this.emojiDrawer.element=a;let n=s.getBoundingClientRect();document.body.appendChild(a),window.innerHeight-n.bottom<250?a.style.top=n.top+window.scrollY-220+"px":a.style.top=n.bottom+window.scrollY+4+"px",a.style.left=Math.max(4,Math.min(n.left+window.scrollX-100,window.innerWidth-310))+"px",this.renderEmojiDrawer(),await this.loadEmoji(!0),this.emojiDrawerOutsideHandler=o=>{this.emojiDrawer.element&&!this.emojiDrawer.element.contains(o.target)&&o.target!==s&&this.closeEmojiDrawer()},setTimeout(()=>{this.emojiDrawerOutsideHandler&&document.addEventListener("click",this.emojiDrawerOutsideHandler)},10),this.emojiDrawerScrollHandler=()=>{this.closeEmojiDrawer()},window.addEventListener("scroll",this.emojiDrawerScrollHandler,!0)}emojiDrawerOutsideHandler=null;emojiDrawerScrollHandler=null;closeEmojiDrawer(){this.emojiDrawerOutsideHandler&&(document.removeEventListener("click",this.emojiDrawerOutsideHandler),this.emojiDrawerOutsideHandler=null),this.emojiDrawerScrollHandler&&(window.removeEventListener("scroll",this.emojiDrawerScrollHandler,!0),this.emojiDrawerScrollHandler=null),this.emojiDrawer.element&&(this.emojiDrawer.element.remove(),this.emojiDrawer.element=null),this.emojiDrawer.visible=!1,this.emojiDrawer.emoji=[]}async loadEmoji(e){if(!this.emojiDrawer.loading&&!(!e&&!this.emojiDrawer.hasMore)){this.emojiDrawer.loading=!0,e&&(this.emojiDrawer.page=0,this.emojiDrawer.emoji=[],this.emojiDrawer.hasMore=!0);try{let t=new URLSearchParams({pack:this.emojiDrawer.pack,page:String(this.emojiDrawer.page),per_page:"30"});this.emojiDrawer.category&&t.set("category",this.emojiDrawer.category),this.emojiDrawer.search&&t.set("search",this.emojiDrawer.search);let s=await fetch(`/api/emoji?${t.toString()}`);if(s.ok){let i=await s.json();this.emojiDrawer.emoji=e?i.emoji:[...this.emojiDrawer.emoji,...i.emoji],this.emojiDrawer.hasMore=i.has_more,this.emojiDrawer.page=i.page+1,this.renderEmojiDrawer()}}catch(t){console.error("Failed to load emoji:",t)}finally{this.emojiDrawer.loading=!1}}}renderEmojiDrawer(){let e=this.emojiDrawer.element;if(!e)return;let t=["twemoji","openmoji","noto"],s=["smileys","people","animals","food","travel","activities","objects","symbols","flags","hands","hearts","other"],i=t.map(r=>`<button class="ed-pack-tab" data-pack="${r}" style="padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600;border:none;cursor:pointer;background:${this.emojiDrawer.pack===r?"#10b981":"#27272a"};color:${this.emojiDrawer.pack===r?"#fff":"#a1a1aa"};transition:all 0.15s;">${r.charAt(0).toUpperCase()+r.slice(1)}</button>`).join(""),a=`<button class="ed-cat-pill" data-cat="" style="padding:2px 6px;border-radius:8px;font-size:10px;border:none;cursor:pointer;white-space:nowrap;background:${this.emojiDrawer.category?"#27272a":"#10b981"};color:${this.emojiDrawer.category?"#a1a1aa":"#fff"};">All</button>`+s.map(r=>`<button class="ed-cat-pill" data-cat="${r}" style="padding:2px 6px;border-radius:8px;font-size:10px;border:none;cursor:pointer;white-space:nowrap;background:${this.emojiDrawer.category===r?"#10b981":"#27272a"};color:${this.emojiDrawer.category===r?"#fff":"#a1a1aa"};">${r}</button>`).join(""),n=this.emojiDrawer.emoji.map(r=>{let c=this.escapeHtml(r.c||""),m=this.escapeHtml(r.pack||this.emojiDrawer.pack),f=this.escapeHtml(r.f||""),b=this.escapeHtml(r.e||r.c||"");return`<button class="ed-emoji-btn" data-codepoint="${c}" data-pack="${m}" style="width:28px;height:28px;padding:0;border:none;background:transparent;cursor:pointer;border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0;" title="${b}"><img src="/static/emoji/${m}/${f}" width="24" height="24" loading="lazy" style="pointer-events:none;"></button>`}).join("");e.innerHTML=`
      <div style="display:flex;gap:4px;margin-bottom:6px;">${i}</div>
      <input class="ed-search" type="text" placeholder="Search emoji..." value="${this.emojiDrawer.search}" style="width:100%;padding:4px 8px;border-radius:6px;border:1px solid #3f3f46;background:#27272a;color:#fafafa;font-size:12px;outline:none;margin-bottom:6px;box-sizing:border-box;">
      <div style="display:flex;gap:3px;overflow-x:auto;padding-bottom:4px;margin-bottom:6px;" class="custom-scrollbar">${a}</div>
      <div class="ed-grid" style="display:grid;grid-template-rows:repeat(5,28px);grid-auto-flow:column;grid-auto-columns:28px;gap:2px;overflow-x:auto;overflow-y:hidden;max-height:152px;padding:2px;" class="custom-scrollbar">${n}${this.emojiDrawer.loading?'<div style="display:flex;align-items:center;justify-content:center;width:60px;grid-row:1/-1;color:#71717a;font-size:11px;">...</div>':""}</div>
    `,e.querySelectorAll(".ed-pack-tab").forEach(r=>{r.addEventListener("click",c=>{c.stopPropagation(),this.emojiDrawer.pack=c.currentTarget.dataset.pack||"twemoji",this.loadEmoji(!0)})}),e.querySelectorAll(".ed-cat-pill").forEach(r=>{r.addEventListener("click",c=>{c.stopPropagation(),this.emojiDrawer.category=c.currentTarget.dataset.cat||"",this.loadEmoji(!0)})});let l=e.querySelector(".ed-search");if(l){let r;l.addEventListener("input",c=>{c.stopPropagation(),clearTimeout(r),r=setTimeout(()=>{this.emojiDrawer.search=l.value,this.loadEmoji(!0)},300)}),l.addEventListener("click",c=>c.stopPropagation())}e.querySelectorAll(".ed-emoji-btn").forEach(r=>{r.addEventListener("click",c=>{c.stopPropagation();let m=c.currentTarget,f=m.dataset.codepoint||"",b=m.dataset.pack||this.emojiDrawer.pack;this.toggleReaction(this.emojiDrawer.targetType,this.emojiDrawer.targetId,b,f,this.emojiDrawer.groupId),this.closeEmojiDrawer()})});let o=e.querySelector(".ed-grid");o&&o.addEventListener("scroll",()=>{if(this.emojiDrawer.hasMore&&!this.emojiDrawer.loading){let r=o;r.scrollLeft+r.clientWidth>=r.scrollWidth-50&&this.loadEmoji()}})}async toggleReaction(e,t,s,i,a){try{let n;e==="post"?n=`/api/posts/${t}/reactions`:e==="dm"?n=`/api/dm/${a}/messages/${t}/reactions`:n=`/api/groups/${a}/messages/${t}/reactions`;let l=await fetch(n,{method:"POST",headers:{"Content-Type":"application/json","X-Auth-Hash":this.appState.hash||""},body:JSON.stringify({emoji:i,pack:s})});if(l.ok){let o=await l.json();if(e==="post"){let r=document.querySelector(`.reactions-display[data-post-id="${t}"]`);r&&this.renderReactionBadges(r,o.reactions,"post",t)}else if(e==="dm"){let r=document.querySelector(`.dm-reactions-display[data-dm-msg-id="${t}"]`);r&&this.renderReactionBadges(r,o.reactions,"dm",t,a)}else{let r=document.querySelector(`.msg-reactions-display[data-msg-id="${t}"]`);r&&this.renderReactionBadges(r,o.reactions,"message",t,a)}}}catch(n){console.error("Failed to toggle reaction:",n)}}async loadReactions(e,t,s){try{let i;e==="post"?i=`/api/posts/${t}/reactions`:e==="dm"?i=`/api/dm/${s}/messages/${t}/reactions`:i=`/api/groups/${s}/messages/${t}/reactions`;let a=await fetch(i,{headers:{"X-Auth-Hash":this.appState.hash||""}});if(a.ok){let n=await a.json(),l;e==="post"?l=document.querySelector(`.reactions-display[data-post-id="${t}"]`):e==="dm"?l=document.querySelector(`.dm-reactions-display[data-dm-msg-id="${t}"]`):l=document.querySelector(`.msg-reactions-display[data-msg-id="${t}"]`),l&&this.renderReactionBadges(l,n.reactions,e,t,s)}}catch{}}renderReactionBadges(e,t,s,i,a){if(!t||typeof t!="object"){e.innerHTML="";return}let n=this.appState.user?.id||"",l=[];for(let[o,r]of Object.entries(t)){if(!r||!r.count||r.count<=0)continue;let c=r.users&&Array.isArray(r.users)&&r.users.includes(n),m=c?"rgba(16,185,129,0.1)":"rgba(63,63,70,0.3)",f=c?"#10b981":"#3f3f46",b=this.escapeHtml(r.pack||"twemoji"),u=this.escapeHtml(r.filename||r.f||""),h=this.escapeHtml(o),v=this.escapeHtml(i),y=a?this.escapeHtml(a):"",w=u?`/static/emoji/${b}/${u}`:"",k=r.user_names&&Array.isArray(r.user_names)?r.user_names.map(S=>this.escapeHtml(S)).join(", "):"";l.push(`<button class="rxn-badge" data-codepoint="${h}" data-pack="${b}" data-target-type="${s}" data-target-id="${v}" data-user-names="${this.escapeHtml(k)}" ${y?`data-group-id="${y}"`:""} style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:999px;border:1px solid ${f};background:${m};cursor:pointer;font-size:11px;color:#d4d4d8;transition:all 0.15s;line-height:1;">${w?`<img src="${w}" width="16" height="16" style="pointer-events:none;">`:h} <span>${r.count}</span></button>`)}e.innerHTML=l.join(""),e.querySelectorAll(".rxn-badge").forEach(o=>{o.addEventListener("click",r=>{r.stopPropagation();let c=r.currentTarget,m=c.dataset.userNames||"";if(document.querySelectorAll(".rxn-tooltip").forEach(h=>h.remove()),!m)return;let f=document.createElement("div");f.className="rxn-tooltip",f.style.cssText="position:absolute;z-index:9999;background:#1c1c20;border:1px solid #3f3f46;border-radius:8px;padding:6px 10px;box-shadow:0 4px 16px rgba(0,0,0,0.5);font-size:12px;color:#d4d4d8;white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis;",f.textContent=m,document.body.appendChild(f);let b=c.getBoundingClientRect();f.style.top=b.top+window.scrollY-f.offsetHeight-6+"px",f.style.left=Math.max(4,Math.min(b.left+window.scrollX+b.width/2-f.offsetWidth/2,window.innerWidth-f.offsetWidth-4))+"px";let u=h=>{f.contains(h.target)||(f.remove(),document.removeEventListener("click",u))};setTimeout(()=>document.addEventListener("click",u),10)})})}attachDMReactionListeners(e){let t=document.getElementById("dm-messages");t&&(t.querySelectorAll(".dm-msg-wrapper").forEach(s=>{s._dmReactionBound||(s._dmReactionBound=!0,s.addEventListener("mouseenter",()=>{let i=s.querySelector(".dm-reaction-btn");i&&(i.style.display="flex")}),s.addEventListener("mouseleave",()=>{let i=s.querySelector(".dm-reaction-btn");i&&(i.style.display="none")}))}),t.querySelectorAll(".dm-reaction-btn").forEach(s=>{s._dmReactionClickBound||(s._dmReactionClickBound=!0,s.addEventListener("click",i=>{i.stopPropagation();let a=i.currentTarget,n=a.dataset.dmMsgId||"";n&&this.openEmojiDrawer("dm",n,a,e)}))}),t.querySelectorAll(".dm-reactions-display[data-dm-msg-id]").forEach(s=>{if(s._dmReactionLoadBound)return;s._dmReactionLoadBound=!0;let i=s.dataset.dmMsgId;i&&this.loadReactions("dm",i,e)}))}attachThreadBadgeListeners(){let e=document.getElementById("messages-container");e&&(e.__threadDelegationAttached||(e.__threadDelegationAttached=!0,e.addEventListener("click",t=>{let s=t.target.closest(".thread-badge-btn");if(s){t.stopPropagation();let i=s.dataset.threadRoot;i&&this.openThreadView(i)}})))}attachMsgReactionListeners(){let e=document.getElementById("messages-container");e&&(e.querySelectorAll(".chat-msg-wrapper").forEach(t=>{t.addEventListener("mouseenter",()=>{let s=t.querySelector(".msg-reaction-btn");s&&(s.style.display="flex")}),t.addEventListener("mouseleave",()=>{let s=t.querySelector(".msg-reaction-btn");s&&(s.style.display="none")})}),e.querySelectorAll(".msg-reaction-btn").forEach(t=>{t.addEventListener("click",s=>{s.stopPropagation();let i=s.currentTarget,a=i.dataset.msgId||"",n=i.dataset.groupId||this.currentGroup?.id||"";a&&this.openEmojiDrawer("message",a,i,n)})}),e.querySelectorAll(".msg-reactions-display[data-msg-id]").forEach(t=>{let s=t.dataset.msgId,i=this.currentGroup?.id;s&&i&&this.loadReactions("message",s,i)}))}};document.addEventListener("DOMContentLoaded",()=>{new Ut});})();
/*! Bundled license information:

dompurify/dist/purify.es.mjs:
  (*! @license DOMPurify 3.3.1 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/3.3.1/LICENSE *)
*/
