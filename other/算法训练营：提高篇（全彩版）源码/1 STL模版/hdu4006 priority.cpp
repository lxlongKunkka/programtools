#include<iostream>
#include<cstdio>
#include<functional>//提供比较函数greater<int> 
#include<queue>
using namespace std;

int main(){
    int i,n,k,c;
    char ch; 
    priority_queue<int,vector<int>,greater<int> >q;//优先队列，最小值优先 
    while(~scanf("%d%d",&n,&k)){
        while(q.size())//初始化队列为空 
			q.pop();             
        for(i=1;i<=n;i++){
	        cin>>ch;
	        if(ch=='I'){
	            scanf("%d",&c);
	            if(q.size()<k) //队列中元素个数小于k
	            	q.push(c);
	            else if(q.top()<c) //当队头元素小于c时
	            	q.pop(),q.push(c);//队头出队，c入队
	        }                        //队列中永远保存最大的k个元素 
	        else
	        	printf("%d\n",q.top()); //队头元素即为第k大元素
        }
    }
    return 0;
}
