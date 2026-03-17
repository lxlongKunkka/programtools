#include<cstdio>
#include<algorithm>
#define lc tr[i].ch[0]
#define rc tr[i].ch[1]
#define Lc tr[j].ch[0]
#define Rc tr[j].ch[1]
#define mid (l+r>>1) //加括号
const int maxn=100005;
using namespace std;
typedef long long ll;
int n,m;
struct node{
    int ch[2];
    ll sum,lazy;
}tr[maxn*20];
int cnt,rt[maxn];

void push_up(int i){tr[i].sum=tr[lc].sum+tr[rc].sum;}

void build(int &i,int l,int r){//创建线段树 
	i=++cnt;
	tr[i].lazy=0;
	if(l==r){
		scanf("%lld",&tr[i].sum);
		return;
	}
	build(lc,l,mid);
	build(rc,mid+1,r);
	push_up(i);
}

void update(int &i,int j,int l,int r,int L,int R,int d){//[L,R]区间增加d
	i=++cnt;
	tr[i]=tr[j];
	tr[i].sum+=1ll*(R-L+1)*d;
	if(l>=L&&r<=R){//当前节点的区间为[l,r]
		tr[i].lazy+=d;
		return;
	}
	if(R<=mid) update(lc,Lc,l,mid,L,R,d);
	else if(L>mid) update(rc,Rc,mid+1,r,L,R,d);
	else{
	    update(lc,Lc,l,mid,L,mid,d);
	    update(rc,Rc,mid+1,r,mid+1,R,d);
	}
}

ll query(int i,int l,int r,int L,int R,ll x){//查询[L,R]的区间和
	if(l>=L&&r<=R)
		return tr[i].sum+1ll*(r-l+1)*x;
	if(R<=mid) return query(lc,l,mid,L,R,x+tr[i].lazy);
	else if(L>mid) return query(rc,mid+1,r,L,R,x+tr[i].lazy);
	else return query(lc,l,mid,L,mid,x+tr[i].lazy)+query(rc,mid+1,r,mid+1,R,x+tr[i].lazy);
}

int main(){
	char op[2];
    while(~scanf("%d%d",&n,&m)){
        cnt=0;
        int now=0;
        build(rt[0],1,n);
        while(m--){
            int L,R,d,t;
            scanf("%s",op);
            if(op[0]=='Q'){
                scanf("%d%d",&L,&R);
                printf("%lld\n",query(rt[now],1,n,L,R,0));
            }
            else if(op[0]=='H'){
                scanf("%d%d%d",&L,&R,&t);
                printf("%lld\n",query(rt[t],1,n,L,R,0));
            }
            else if(op[0]=='B'){
                scanf("%d",&t);
                now=t;
                cnt=rt[t+1]-1;//没有此句会浪费5倍空间！ 
            }
            else{
                scanf("%d%d%d",&L,&R,&d);
                now++;
                update(rt[now],rt[now-1],1,n,L,R,d);
            }
        }
    }
    return 0;
}
