#include<iostream>
#include<cstring>
using namespace std;
const int N=1005;
const int INF=0x3f3f3f3f; //无穷大
struct node{//边集数组 
	int a,b,w;
}e[N*N];//坑点！！！边数要设置为N*N 
int dist[N];
int n,m,cnt;

void add(int u,int v,int w){//添加一条边 
	e[cnt].a=u;
	e[cnt].b=v;
	e[cnt++].w=w;
}

bool bellman_ford(int u){//求源点u到其它各个顶点的最短路径长度，可以判负环 
	memset(dist,0x3f,sizeof(dist));
	dist[u]=0;
	for(int i=1;i<n;i++){//执行n-1次
		bool flag=false;
		for(int j=0;j<m;j++)//边数m或cnt，如果是无向图，注意边数是2m
			if(dist[e[j].b]>dist[e[j].a]+e[j].w){
				dist[e[j].b]=dist[e[j].a]+e[j].w;
				flag=true;
			}
		if(!flag)
			return false;
	}
	for(int j=0;j<m;j++)//再执行1次，还能松弛说明有负环
		if(dist[e[j].b]>dist[e[j].a]+e[j].w)
			return true;
	return false;
}

void print(){//输出源点到其它节点的最短距离 
	for(int i=1;i<=n;i++){
    	if(i!=1) cout<<" ";
        if(dist[i]==INF)
        	cout<<"impossible";
        else
        	cout<<dist[i];
    }
    cout<<endl;
}

int main(){
	int t;//测试用例数
	int u,v,w,st;
    cin>>t;
    while(t--){
		cnt=0;
		cin>>n>>m;
		for(int i=0;i<m;i++){
			cin>>u>>v>>w;
			add(u,v,w);
		}
		cin>>st;//输入源点
		if(bellman_ford(st))
			cout<<"图中有负环！"<<endl;
		else
			print(); 
    }
	return 0;
}
/*测试样例 
2
5 8
1 2 2
1 3 5
2 3 2
2 4 6
3 4 7
3 5 1
4 3 2
4 5 4
1
4 4
1 2 3
2 3 -4
3 4 2
4 2 1
1
*/
