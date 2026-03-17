#include<cstdio>
#include<cstring>
using namespace std;
#define mod 100000000
int m,n,top=0;
int state[600];
int dp[20][600];//dp[i][j]表示第i行，第j个合法状态时，前i行的可行方案数 
int cur[20];

bool check(int x){//合法性，判断种植状态x的二进制数是否有相邻的1
   if(x&x<<1) return 0;
   return 1;
}

bool fit(int x,int k){//匹配性，判断种植状态x是否与土地状态cur[k]匹配 
   if(x&cur[k]) return 0;
   return 1;
}

void init(){//记录所有合法种植状态（没有相邻1）
   top=0;
   for(int S=0;S<1<<n;S++)//n个格子，2^n种情况 
       if(check(S)) state[++top]=S;
}

void solve(){
	for(int j=1;j<=top;j++)//处理第一行，检查每种合法种植状态
		if(fit(state[j],1))//匹配性检测，种植状态state[j]和第1行土地状态匹配
			dp[1][j]=1;
	for(int i=2;i<=m;i++){//处理2～m行 
		for(int j=1;j<=top;j++){//检查每种合法种植状态
			if(!fit(state[j],i)) continue; //匹配性检测，种植状态state[j]和第i行土地状态不匹配
			for(int k=1;k<=top;k++){ //冲突检测，是否与i-1行的状态冲突 
				if(state[j]&state[k]) continue; //与上一行有冲突 
				dp[i][j]=(dp[i][j]+dp[i-1][k])%mod;
			}
		}
	}
} 

int main(){
    while(~scanf("%d%d",&m,&n)){
		init();
		memset(dp,0,sizeof(dp));
		for(int i=1;i<=m;i++){
			cur[i]=0;
			int num;
			for(int j=1;j<=n;j++){//地图预处理，与原地图相反 
				scanf("%d",&num);
				if(num==0) cur[i]+=(1<<(n-j));//0转换为1，0表示肥沃，1表示贫瘠
			}
		}
		solve();
		int ans=0;
		for(int j=1;j<=top;j++)//累加最后一行 
			ans=(ans+dp[m][j])%mod;
		printf("%d\n",ans);
	}
	return 0;
}
