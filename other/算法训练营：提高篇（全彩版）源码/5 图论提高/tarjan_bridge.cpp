#include<iostream>
#include<cstring>
using namespace std;
const int maxn=1000+5;
int n,m,head[maxn],cnt;
int low[maxn],dfn[maxn],num;//追溯点，时间戳 
struct Edge{
	int to,next;
}e[maxn<<1];

void add(int u,int v){
	e[++cnt].next=head[u];
	e[cnt].to=v;
	head[u]=cnt;	
}

void tarjan(int u,int fa){//求桥 
	dfn[u]=low[u]=++num;
	for(int i=head[u];i;i=e[i].next){
		int v=e[i].to;
		if(v==fa) //v是u的父节点 
			continue;
		if(!dfn[v]){ //未赋值（未访问） 
			tarjan(v,u);
			low[u]=min(low[u],low[v]);
			if(low[v]>dfn[u])
				cout<<u<<"—"<<v<<"是桥"<<endl; 
		}
		else
			low[u]=min(low[u],dfn[v]);
	}
}

void init(){
	memset(head,0,sizeof(head));
	memset(low,0,sizeof(low));
	memset(dfn,0,sizeof(dfn));
	cnt=num=0;
}

int main(){
	while(cin>>n>>m){
		init();
		int u,v;
		while(m--){
			cin>>u>>v;
			add(u,v);
			add(v,u);
		}
		for(int i=1;i<=n;i++)//有可能是非连通图，需要从每个节点开始检查 
			if(!dfn[i])
				tarjan(i,0);
	}
	return 0;
}
