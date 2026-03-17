#include<cstdio>
#include<cstring>
#include<queue>
using namespace std;
const int maxn=1005,maxe=1000001;
const int inf=0x3f3f3f3f;
int T,n,m,w,cnt;
int head[maxn],dist[maxn];//dist[v]表示从源点到节点v所有路径上最小边权的最大值 
bool vis[maxn];//标记是否已访问 
struct node{
	int to,next,w;
}e[maxe];

void add(int u,int v,int w){
	e[cnt].to=v;
	e[cnt].next=head[u];
	e[cnt].w=w;	
	head[u]=cnt++;
}

void solve(int u){//dijkstra算法变形，求最小值最大的路径 
	priority_queue<pair<int,int> >q;
	memset(vis,false,sizeof(vis));
	memset(dist,0,sizeof(dist));
	dist[u]=inf;
	q.push(make_pair(dist[u],u));//最大值优先
	while(!q.empty()){
		int x=q.top().second;
		q.pop();
		if(vis[x]) continue;
		vis[x]=true;
		if(vis[n]) return;
		for(int i=head[x];~i;i=e[i].next){
			int v=e[i].to;
			if(vis[v]) continue;
			if(dist[v]<min(dist[x],e[i].w)){//求最小值最大的
				dist[v]=min(dist[x],e[i].w);
				q.push(make_pair(dist[v],v));
			}
		}
	}
}

int main(){
	int cas=1;
	scanf("%d",&T);
	while(T--){
		cnt=0;
		memset(head,-1,sizeof(head));
		scanf("%d%d",&n,&m); //本题数据量大，用c风格输入输出，否则tle 
		int u,v,w;
		for(int i=1;i<=m;i++){
			scanf("%d%d%d",&u,&v,&w);
			add(u,v,w);//两条边 
			add(v,u,w);
		}
		solve(1); 
		printf("Scenario #%d:\n",cas++);
		printf("%d\n\n",dist[n]);
	}
	return 0;
}
