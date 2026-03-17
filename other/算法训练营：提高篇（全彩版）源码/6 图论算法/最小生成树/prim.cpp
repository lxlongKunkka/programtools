//最小生成树，Prim算法
#include<iostream>
#include<algorithm>
using namespace std;
const int inf=0x3f3f3f3f;
const int N=1005;
int c[N][N],closest[N],lowcost[N],ans[N];
bool s[N];//如果s[i]=true,说明节点i已加入U
int n,m;//节点数，边数 

int prim(int n){ //求最小生成树
	s[1]=true; //初始时，集合中U只有一个元素，即顶点1
	lowcost[1]=0;
	for(int i=2;i<=n;i++){//初始化 
        lowcost[i]=c[1][i];
        closest[i]=1;
        s[i]=false;
	}
    for(int i=1;i<n;i++){ 
		int temp=inf;
		int t=1;
		for(int j=1;j<=n;j++){//在V-U集合中寻找lowcost[j]最小的节点t
		    if(!s[j]&&lowcost[j]<temp){
		        t=j;
		        temp=lowcost[j];
		    }
		}
		if(t==1)
		    return 0;//找不到t，跳出循环，不存在最小生成树（非连通图） 
		s[t]=true;//否则，t加入U集合
		for(int j=1;j<=n;j++){ //更新lowcost和closest
		    if(!s[j]&&c[t][j]<lowcost[j]){
		        lowcost[j]=c[t][j];
		        closest[j]=t;
		    }
		}
    }
	int sumcost=0;
	for(int i=1;i<=n;i++)
		sumcost+=lowcost[i];
    return sumcost;
}

int main(){
	int t,u,v,w;
	cin>>t;
	while(t--){
        cin>>n>>m;
        for(int i=1;i<=n;i++)//初始化 
        	for(int j=1;j<=n;j++)
            	c[i][j]=inf;
        for(int i=0;i<m;i++){
        	cin>>u>>v>>w;
        	c[u][v]=c[v][u]=min(c[u][v],w);
    	}
        cout<<prim(n)<<endl;
	}
    return 0;
}
/*测试样例 
1
7 12
1 2 23
1 6 28
1 7 36
2 3 20
2 7 1
3 4 15
3 7 4
4 5 3
4 7 9
5 6 17
5 7 16
6 7 25
*/ 
