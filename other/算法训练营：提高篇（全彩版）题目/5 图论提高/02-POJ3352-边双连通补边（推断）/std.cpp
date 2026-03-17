#include<iostream>
#include<cstring>
#include<stack>
using namespace std;
const int maxn=1000+5;
int n,m,head[maxn],cnt,id,belong[maxn];
int low[maxn],dfn[maxn],degree[maxn],num;
bool ins[maxn];//标记是否在栈内 
stack<int>s;
struct Edge{
	int to,next;
}e[maxn<<1];

void add(int u,int v){
	e[++cnt].next=head[u];
	e[cnt].to=v;
	head[u]=cnt;	
}

void tarjan(int u,int fa){//求边双连通分量
	low[u]=dfn[u]=++num;
	ins[u]=true;
	s.push(u);
	for(int i=head[u];i;i=e[i].next){
		int v=e[i].to;
		if(v==fa) continue;
		if(!dfn[v]){
			tarjan(v,u);
			low[u]=min(low[u],low[v]);
		}
		else if(ins[v])
			low[u]=min(low[u],dfn[v]);
	}
	if(low[u]==dfn[u]){
		int v;
		do{
			v=s.top();
			s.pop();
			belong[v]=id;
			ins[v]=false;
		}while(v!=u);
		id++;
	}
}

void init(){
	memset(head,0,sizeof(head));
	memset(low,0,sizeof(low));
	memset(dfn,0,sizeof(dfn));
	memset(degree,0,sizeof(degree));
	memset(ins,false,sizeof(ins));
	memset(belong,0,sizeof(belong));
	cnt=num=0;
	id=1;
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
		tarjan(1,0);
		for(int u=1;u<=n;u++)
			for(int i=head[u];i;i=e[i].next){
				int v=e[i].to;
				if(belong[u]!=belong[v])
					degree[belong[u]]++;
			}
		int leaf=0;
		for(int i=1;i<=n;i++){
			if(degree[i]==1)
				leaf++;
			//cout<<dfn[i]<<"\t"<<low[i]<<"\t"<<belong[i]<<"\t"<<degree[i]<<endl;
		}	
		cout<<(leaf+1)/2<<endl;
	}
	return 0;
}
/*test1 
11 12
1 4
1 2
2 3 
3 8 
3 5 
5 7 
5 6 
6 4 
7 8 
8 9 
9 10 
9 11
*/ 
/*test2
11 12
1 4
1 2
2 3 
3 5 
8 7
3 8 
5 7 
5 6 
6 4 
8 9 
9 10 
9 11
*/ 
