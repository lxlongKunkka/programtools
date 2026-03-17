#include<iostream>
#include<cstring>
using namespace std;
const int maxn=1000+5;
int n,m,head[maxn],cnt,root;
int low[maxn],dfn[maxn],num;
struct Edge{
	int to,next;
}e[maxn<<1];

void add(int u,int v){
	e[++cnt].next=head[u];
	e[cnt].to=v;
	head[u]=cnt;	
}

void tarjan(int u,int fa){//求割点 
	dfn[u]=low[u]=++num;
	int count=0;
	for(int i=head[u];i;i=e[i].next){
		int v=e[i].to;
		if(v==fa) //v是u的父节点 
			continue;
		if(!dfn[v]){ //未赋值（未访问） 
			tarjan(v,u);
			low[u]=min(low[u],low[v]);
			if(low[v]>=dfn[u]){
				count++;
				if(u!=root||count>1)//不是树根 或者 是树根且有两个以上满足 
					cout<<u<<"是割点"<<endl; 
			}	
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

void print(){
	for(int i=1;i<=n;i++){
		cout<<dfn[i]<<"\t"<<low[i]<<endl;
	}
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
			if(!dfn[i]){
				root=i; //记录起点作为树根 
				tarjan(i,0);
			}
		print();
	}
	return 0;
}
/*
7 7
1 4
1 2
2 3
3 5
5 7
5 6
6 4
*/ 
/*
8 9
1 4
1 2
2 3
3 8
3 5
5 7
5 6
6 4
7 8
*/ 
