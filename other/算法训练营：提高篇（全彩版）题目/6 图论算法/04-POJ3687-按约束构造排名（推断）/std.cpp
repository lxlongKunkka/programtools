#include<iostream>
#include<cstring>
#include<stack>
using namespace std;
const int maxn=205;
int map[maxn][maxn],in[maxn],w[maxn];
int n,m,T,u,v;
bool flag;

void TopoSort(){ //拓扑排序
	flag=0;
	for(int i=n;i>0;i--){
		int t=-1;
		for(int j=n;j>0;j--)
			if(!in[j]){
				t=j;
				break;
			}
		if(t==-1){//有环
			flag=1;
			return;
		}
		in[t]=-1;
		w[t]=i;
		for(int j=1;j<=n;j++)
			if(map[t][j])
				in[j]--; 
	}
}

int main(){
	cin>>T;
	while(T--){
		memset(map,0,sizeof(map));
		memset(in,0,sizeof(in));
		cin>>n>>m;
		for(int i=1;i<=m;i++){
			cin>>u>>v;
			if(!map[v][u]){//建立逆向图，检查重复边 
				map[v][u]=1;
				in[u]++;
			}
		}
		TopoSort();
		if(flag){
			cout<<-1<<endl;
			continue;
		}
		for(int i=1;i<n;i++)
			cout<<w[i]<<" ";
		cout<<w[n]<<endl;
	}
	return 0;
}
