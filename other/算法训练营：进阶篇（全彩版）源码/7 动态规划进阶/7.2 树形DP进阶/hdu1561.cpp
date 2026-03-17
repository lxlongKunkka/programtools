#include<cstdio>
#include<cstring>
#include<algorithm>
#include<vector>
using namespace std;
const int N=200+10;
int val[N],dp[N][N];
vector<int>E[N];

void dfs(int u,int m){
	dp[u][1]=val[u];
	for(int i=0;i<E[u].size();i++){
		int v=E[u][i];
		dfs(v,m-1);
		for(int j=m;j>=1;j--)//类似分组背包倒推 
			for(int k=1;k<j;k++)
				dp[u][j]=max(dp[u][j],dp[v][k]+dp[u][j-k]);
	}
}

int main(){
	int n,m;
	while(~scanf("%d%d",&n,&m),n+m){//n+m为0时，结束 
		for(int i=0;i<=n;i++)
			E[i].clear();
		memset(dp,0,sizeof(dp));
		m++;//增加超根后，m+1 
		val[0]=0;
		int u;
		for(int i=1;i<=n;i++){
			scanf("%d%d",&u,&val[i]);
			E[u].push_back(i);
		}
	    dfs(0,m);
	    printf("%d\n",dp[0][m]);
    }
    return 0;
}
