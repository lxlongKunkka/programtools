//dijkstra算法+优先队列优化 
#include<iostream>
#include<algorithm>
#include<queue>
using namespace std;
const int N=1005;
const int INF=0x3f3f3f3f; //无穷大
int G[N][N],dist[N]; //G[][]为邻接矩阵，dist[i]表示源点到结点i的最短路径长度
int n,m; //n为结点数，m为边数
bool flag[N]; //如果flag[i]等于true，说明结点i已经加入到S集合;否则i属于V-S集合

struct node{
    int u,dis;//结点u,源点到u的最短路径长度dis
    node(){};
    node(int _u,int _dis){//构造函数，赋值方便 
        u=_u; dis=_dis;
    }
    bool operator < (const node &a)const{ //重载<,优先队列优先级，dis越小越优先 
        return dis>a.dis;
    }
};

void dijkstra(int u){
	priority_queue<node>que;  // 优先队列优化
    for(int i=1;i<=n;i++){
    	dist[i]=INF; // 初始化所有距离为无穷大
    	flag[i]=false;
	}
	dist[u]=0;
	node vs=node(u,0);
    que.push(vs);
    while(!que.empty()){
        node it=que.top();//优先队列队头元素为dist最小值
        que.pop();
        int t=it.u;
        if(flag[t])//说明已经找到了最短距离，该结点是队列里面的重复元素
            continue;
        flag[t]=true;
        for(int j=1;j<=n;j++){//松弛操作 
            if(!flag[j]&&dist[j]>dist[t]+G[t][j]){
                dist[j]=dist[t]+G[t][j];
                que.push(node(j,dist[j])); //把更新后的最短距离压入优先队列，注意：里面的元素有重复
            }
        }
    }
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
    int u,v,w,st;//u、v表示结点，w表示u--v的距离，st表示源点
    int t;//测试用例数 
    cin>>t;
    while(t--){
    	cin>>n>>m;
        for(int i=1;i<=n;i++)
        	for(int j=1;j<=n;j++)
            	G[i][j]=INF;//初始化邻接矩阵为无穷大
        while(m--){
            cin>>u>>v>>w;
            G[u][v]=min(G[u][v],w); //邻接矩阵储存，保留最小的距离
        }
        cin>>st;//输入源点 
        dijkstra(st);
        print();
    }
    return 0;
}
