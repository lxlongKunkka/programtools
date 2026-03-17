#include<iostream>
#include<cstring>
using namespace std;
const int N=100; //顶点数最大值
const int INF=0x3f3f3f3f; // 无穷大
int G[N][N],dist[N][N]; //G[][]为邻接矩阵，dist[i][j]表示i到j的最短路径长度
int p[N][N]; //p[i][j]表示i到j的最短路径上j的前驱
int n,m; //n为结点数，m为边数

void Floyd(){ //用Floyd算法求有向网G中各对顶点i和j之间的最短路径
	for(int i=0;i<n;i++){ //初始化
		for(int j=0;j<n;j++){
			if(i==j)
				dist[i][j]=0;//自己到自己最短距离为0 
			else
				dist[i][j]=G[i][j];
			if(dist[i][j]<INF&&i!=j)
				p[i][j]=i;  //如果i和j之间有边，则将j的前驱置为i
			else
				p[i][j]=-1; //如果i和j之间无边，则将j的前驱置为-1
		}
	}
	for(int k=0;k<n;k++)
		for(int i=0;i<n;i++)
			for(int j=0;j<n;j++)
				if(dist[i][k]+dist[k][j]<dist[i][j]){//从i经k到j的一条路径更短
					dist[i][j]=dist[i][k]+dist[k][j]; //更新dist[i][j]
					p[i][j]=p[k][j]; //更改j的前驱
				}
}

void print(){
    for(int i=0;i<n;i++){//输出最短距离数组
        for(int j=0;j<n;j++)
            cout<<dist[i][j]<<"\t";
        cout<<endl;
    }
    cout<<endl;
    for(int i=0;i<n;i++){//输出前驱数组
        for(int j=0;j<n;j++)
            cout<<p[i][j]<<"\t";
        cout<<endl;
    }
}

void DisplayPath(int s,int t){//输出s到t的最短路径
	if(p[s][t]!=-1){
		DisplayPath(s,p[s][t]);
		cout<<p[s][t]<<"-->";
	}
}

int main(){
    int u,v,w;
	cin>>n>>m;
    for(int i=0;i<n;i++)//初始化邻接矩阵
    	for(int j=0;j<n;j++)
			G[i][j]=INF;
    for(int i=0;i<m;i++){
        cin>>u>>v>>w;
        G[u][v]=min(G[u][v],w); //邻接矩阵储存，保留最小的距离
    }
    Floyd();
    print();
	cout<<"输入路径的起点u与终点v,输出u到v的最短路径"<<endl;
	cin>>u>>v;
	cout<<"最短路径为：";
	DisplayPath(u,v);
	cout<<v<<endl;
	cout<<"最短路径的长度为："<<dist[u][v]<<endl;
    return 0;
}
/*测试样例 
4 8
0 1 1
0 3 4
1 2 9
1 3 2
2 0 3
2 1 5
2 3 8
3 2 6
0 2
*/
