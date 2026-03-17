#include<cstdio> //poj3468
#include<algorithm>
#include<cmath>
#define ll long long
#define N 100010
using namespace std;
ll a[N],sum[N],add[N];
int L[N],R[N],d;
int pos[N];
int n,m,t,l,r;
char op[3];

void build(){//分块 
	t=sqrt(n*1.0);//float sqrt (float),double sqrt (double),double long sqrt(double long)
	int num=n/t;
	if(n%t)  num++;
	for(int i=1;i<=num;i++){
		L[i]=(i-1)*t+1;//每块的左右 
		R[i]=i*t;
	}
	R[num]=n;
	for(int i=1;i<=num;i++){ 
		for(int j=L[i];j<=R[i];j++){
			pos[j]=i;//表示属于哪个块
			sum[i]+=a[j];//计算每块和值
		}
	}
} 

void change(int l,int r,long long d){//区间更新，[l,r]区间的元素加d 
	int p=pos[l],q=pos[r];//读取所属块 
	if(p==q){//在一块中
		for(int i=l;i<=r;i++)//暴力修改 
			a[i]+=d;
		sum[p]+=d*(r-l+1);//修改和值 
	}
	else{
		for(int i=p+1;i<=q-1;i++)//中间完全覆盖块打懒标记 
			add[i]+=d;
		for(int i=l;i<=R[p];i++)//左端暴力修改 
			a[i]+=d;
		sum[p]+=d*(R[p]-l+1); //修改和值 
		for(int i=L[q];i<=r;i++)//右端暴力修改
			a[i]+=d;
		sum[q]+=d*(r-L[q]+1);//修改和值
	}
}

ll query(int l,int r){//区间查询，查询[l,r]区间的元素和值
	int p=pos[l],q=pos[r];
	ll ans=0;
	if(p==q){//在一块中
		for(int i=l;i<=r;i++)//累加 
			ans+=a[i];
		ans+=add[p]*(r-l+1);//计算懒标记 
	}
	else{
		for(int i=p+1;i<=q-1;i++)//累加中间块 
			ans+=sum[i]+add[i]*(R[i]-L[i]+1);
		for(int i=l;i<=R[p];i++)//左端暴力累加
			ans+=a[i];
		ans+=add[p]*(R[p]-l+1);
		for(int i=L[q];i<=r;i++)//右端暴力累加
			ans+=a[i];
		ans+=add[q]*(r-L[q]+1);
	}
	return ans;
}

int main(){
	scanf("%d%d",&n,&m);
	for(int i=1;i<=n;i++)
		scanf("%lld",&a[i]);
	build(); 
	for(int i=1;i<=m;i++){
		scanf("%s %d %d",op,&l,&r);
		if(op[0]=='C'){
			scanf("%d",&d);
			change(l,r,d);
		}
		else
			printf("%lld\n",query(l,r));
	}
    return 0;
}
