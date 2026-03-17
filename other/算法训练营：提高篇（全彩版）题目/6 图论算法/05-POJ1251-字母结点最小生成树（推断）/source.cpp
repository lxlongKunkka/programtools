#include<iostream>
#include<cstring>
using namespace std;
int m[30][30],dis[30];
bool vis[30];
int n;

int prim(int s){
	for(int i=0;i<n;i++)
		dis[i]=m[s][i];//dis[i]代表i到U集合的最邻近点的边权 
	memset(vis,false,sizeof(vis));//vis[i]代表i节点是否属于U集合，true表示属于U集合，false表示属于V-U集合 
	vis[s]=true;
	int sum=0,t;//sum表示最小生成树的边权之和
	for(int i=1;i<n;i++){//执行n-1次 
		int minx=0x3f3f3f3f;
		for(int j=0;j<n;j++){//找最小值 
			if(!vis[j]&&dis[j]<minx) {
				minx=dis[j];//记录最小值 
				t=j;//记录节点编号 
			}
		}
		sum+=minx;
		vis[t]=true;//t加入U集合
		for(int j=0;j<n;j++){//更新t的邻接点（V-U） 
			if(!vis[j]&&dis[j]>m[t][j]) 
				dis[j]=m[t][j];
		} 
	} 
	return sum; 
}

int main(){
	while(cin>>n&&n){
		int num,w;
		char c;
		memset(m,0x3f,sizeof(m));
		for(int i=1;i<n;i++){
			cin>>c>>num;
			int u=c-'A';
			while(num--){
				cin>>c>>w;
				int v=c-'A';
				if(w<m[u][v])
					m[u][v]=m[v][u]=w;
			}
		 }
		 cout<<prim(0)<<endl;
	}
	return 0;
}
