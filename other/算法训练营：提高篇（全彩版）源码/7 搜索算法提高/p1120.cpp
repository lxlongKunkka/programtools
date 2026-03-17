#include<bits/stdc++.h>
using namespace std;
const int N=55; //木棍长度不超过50，定义桶排序的数量 
int num[N],maxn,minn,sum;

void dfs(int cnt,int len,int need,int mlen){ //待拼凑数量，已拼凑长度，需要得到长度，枚举最大长度
	if(cnt==0){	//已拼凑完成所有木棍，输出结果
		printf("%d",need); 
		exit(0); //退出程序
	}
	if(len==need){ //如果当前已拼凑长度等于需要得到的长度，则继续拼凑下一根
		dfs(cnt-1,0,need,maxn);
		return;
	}
	for(int i=mlen;i>=minn;i--){ //从大到小枚举木棍长度，长的先枚举，短的放后面更容易拼凑成功 
		if(num[i] && i+len<=need){
			num[i]--;
			dfs(cnt,len+i,need,i);
			num[i]++;
			if(len==0 || len+i==need) //如果已拼凑长度为0或可以达到需要得到长度，仍未找到答案 
				return;
		}
	}
}
	
int main(){
	int n,x;
	scanf("%d",&n);
	for(int i=1;i<=n;i++){
		scanf("%d",&x);
		if(x>50) continue; //忽略长度大于50的木棍 
		sum+=x;
		num[x]++; //桶排序，num[N]相当于N个桶，速度更快 
		minn=min(x,minn);
		maxn=max(x,maxn);
	}
	for(int i=maxn;i<=sum/2;i++) //从小到大枚举每一种可能的长度，第一次拼凑成功的一定是最小长度 
		if(sum%i==0)
			dfs(sum/i,0,i,maxn);
	printf("%d",sum);
	return 0;
}
