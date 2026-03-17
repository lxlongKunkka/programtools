#include<iostream>
#include<cstdlib>
#include<ctime>
using namespace std;
const int maxn=100005;
int n,cnt,root;//结点数，结点存储下标累计，树根 
struct node{
	int lc,rc;//左右孩子
	int val,pri;//值，优先级
}tr[maxn];

int New(int val){//生成新结点 
	tr[++cnt].val=val;
	tr[cnt].pri=rand();
	tr[cnt].rc=tr[cnt].lc=0;
	return cnt;
}

void zig(int &p){//右旋 
	int q=tr[p].lc;
	tr[p].lc=tr[q].rc;
	tr[q].rc=p;
	p=q;//现在q为根 
}

void zag(int &p){//左旋 
	int q=tr[p].rc;
	tr[p].rc=tr[q].lc;
	tr[q].lc=p;
	p=q;//现在q为根 
}

void Insert(int &p,int val){//在p的子树插入值val 
	if(!p){
		p=New(val);
		return;
	}
	if(val==tr[p].val)
		return;
	if(val<tr[p].val){
		Insert(tr[p].lc,val);
		if(tr[p].pri<tr[tr[p].lc].pri)
			zig(p);	
	}
	else{
		Insert(tr[p].rc,val);
		if(tr[p].pri<tr[tr[p].rc].pri)
			zag(p);	
	}
}

void Delete(int &p,int val){//在p的子树删除值val 
	if(!p)
		return;
	if(val==tr[p].val){
		if(!tr[p].lc||!tr[p].rc)
			p=tr[p].lc+tr[p].rc;//有一个儿子为空，直接用儿子代替
		else if(tr[tr[p].lc].pri>tr[tr[p].rc].pri){
				zig(p);
				Delete(tr[p].rc,val);
		 	}
		 	else{
				zag(p);
				Delete(tr[p].lc,val);
		 	}
		return;
	}
	if(val<tr[p].val)
		Delete(tr[p].lc,val);	
	else
		Delete(tr[p].rc,val);
}

void treap(){//创建treap 
	int x;
	cin>>n;
	for(int i=1;i<=n;i++){
		cin>>x;
		Insert(root,x);
	}
}

void print(int p){//输出treap中序遍历
	if(p){
		print(tr[p].lc);
		cout<<tr[p].val<<" "<<tr[p].pri<<" "<<tr[tr[p].lc].val<<" "<<tr[tr[p].rc].val<<" "<<endl;
		print(tr[p].rc);
	}
}

int main(){	
	srand(time(0));//系统时间作为随机数种子 
	treap();
	print(root);
	int t;
	cin>>t;
	while(t--){
		int opt,x;
		cin>>opt>>x;
		switch(opt){
			case 1:
				Insert(root,x);
				print(root);
				break;
			case 2:
				Delete(root,x);
				print(root);
				break;
		}	
	}
	return 0;
}
/*测试样例
5
1 2 3 4 5
2
1 10
2 5
*/ 
