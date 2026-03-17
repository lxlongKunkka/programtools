#include<iostream>
#include<cstdio>
#include<cstring>
#include<algorithm>
using namespace std;
int maxval,minval;
typedef struct AVLNode{
   int data,num;
   int height;
   struct AVLNode *lchild;
   struct AVLNode *rchild;
}*AVLTree;

int Height(AVLTree T){//计算高度
    if(!T) return 0;
    return T->height;
}

void updateHeight(AVLTree &T){//更新高度 
	if(!T) return;
	T->height=max(Height(T->lchild),Height(T->rchild))+1;
}

AVLTree LL_Rotation(AVLTree &T){//LL旋转
    AVLTree temp=T->lchild;
    T->lchild=temp->rchild;
    temp->rchild=T;
    updateHeight(T);//更新高度
    updateHeight(temp);
    return temp;
}

AVLTree RR_Rotation(AVLTree &T){//RR旋转
    AVLTree temp=T->rchild;
    T->rchild=temp->lchild;
    temp->lchild=T;
    updateHeight(T);//更新高度
    updateHeight(temp);
    return temp;
}

AVLTree LR_Rotation(AVLTree &T){//LR旋转
    T->lchild=RR_Rotation(T->lchild);
    return LL_Rotation(T);
}

AVLTree RL_Rotation(AVLTree &T){//RL旋转
    T->rchild=LL_Rotation(T->rchild);
    return RR_Rotation(T);
}


void adjust(AVLTree &T){//调平衡
	if(!T)	return;
	if(Height(T->lchild)-Height(T->rchild)>1){//沿着高度大的那条路径判断
		if(Height(T->lchild->lchild)>=Height(T->lchild->rchild))
			T=LL_Rotation(T);
		else
			T=LR_Rotation(T);
	}
	else if(Height(T->rchild)-Height(T->lchild)>1){//沿着高度大的那条路径判断
		if(Height(T->rchild->rchild)>=Height(T->rchild->lchild))
			T=RR_Rotation(T);
		else
			T=RL_Rotation(T);
	}
}

AVLTree Insert(AVLTree &T,int num,int x){//插入 
	if(!T){ //如果为空，创建新结点
		T=new AVLNode;
		T->lchild=T->rchild=NULL;
		T->num=num;
		T->data=x;
		T->height=1;
		return T;
	}
	if(T->data==x) return T;//查找成功，什么也不做，查找失败时才插入
	if(x<T->data)
		T->lchild=Insert(T->lchild,num,x);//插入到左子树
	else
		T->rchild=Insert(T->rchild,num,x);//插入到右子树
	updateHeight(T);
	adjust(T);
	return T;
}

AVLTree Delete(AVLTree &T,int x){//删除 
	if(!T) return T;
	if(T->data==x){//如果找到删除节点
		if(!T->lchild||!T->rchild){//如果有一个孩子为空,子承父业
			AVLTree temp=T;
			T=(T->lchild)?T->lchild:T->rchild;
			delete temp;
		}
		else{//否则，其直接前驱（左子树的最右节点）代替之，然后删除其直接前驱 
			AVLTree temp;
			temp=T->lchild;
			while(temp->rchild)
				temp=temp->rchild;
			T->num=temp->num;//替换数据
			T->data=temp->data;
			T->lchild=Delete(T->lchild,T->data);
		}
	}
	else if(T->data>x)
		T->lchild=Delete(T->lchild,x);//在左子树中删除 
	else
		T->rchild=Delete(T->rchild,x);//在右子树中删除 
	updateHeight(T);
	adjust(T);
	return T;
}

void printmax(AVLTree T){//找优先级最大的结点编号 
	while(T->rchild){
		T=T->rchild;
	}
	cout<<T->num<<endl;
	maxval=T->data;
}

void printmin(AVLTree T){//找优先级最低的结点编号 
	while(T->lchild){
		T=T->lchild;
	}
	cout<<T->num<<endl;
	minval=T->data;
}

int main(){
    AVLTree root=NULL;//一定要置空 
	int n,num,val;
	while(~scanf("%d",&n),n){//注意使用cin超时 
		switch(n){
			case 1:
				scanf("%d%d",&num,&val);
				Insert(root,num,val);
				break;
			case 2:
				if(!root)
					cout<<0<<endl;
				else{
					printmax(root);
					Delete(root,maxval);
				}
				break;
			case 3:
				if(!root)
					cout<<0<<endl;
				else{
					printmin(root);
					Delete(root,minval);
				}
				break;
		}
	}
    return 0;
}
