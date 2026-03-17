#include<iostream>
#include<cstring>
using namespace std;
#define m 15//哈希表的表长
#define NULLKEY 0//单元为空的标记
int HT[m],HC[m];

int H(int key){//哈希函数
	return key%13;
}

int Linedetect(int HT[],int H0,int key,int &cnt){//线性探测
    for(int i=1;i<m;++i){
        cnt++;
        int Hi=(H0+i)%m; //按照线性探测法计算下一个哈希地址Hi
        if(HT[Hi]==NULLKEY || HT[Hi]==key)
            return Hi;	//若单元Hi为空，则所查元素不存在
    }
    return -1;
}

int Seconddetect(int HT[],int H0,int key,int &cnt){//二次探测
    for(int i=1;i<=m/2;++i){
        int i1=i*i,i2=-i1;
        cnt++;
        int Hi=(H0+i1)%m; //按照二次探测法计算下一个哈希地址
        if(HT[Hi]==NULLKEY || HT[Hi]==key)//若单元Hi为空或查找成功 
            return Hi;
        cnt++;
        Hi=(H0+i2)%m; //按照二次探测法计算下一个哈希地址
        if(Hi<0)
            Hi+=m;
        if(HT[Hi]==NULLKEY || HT[Hi]==key)//若单元Hi为空或查找成功
            return Hi;
    }
    return -1;
}

void SearchHash(int HT[],int key){//在哈希表中查找关键字为key的元素
    int H0=H(key); //计算哈希地址
    int Hi,cnt=1;
    if(HT[H0]==NULLKEY)//若单元H0为空，则所查元素不存在
        cout<<"查找失败"<<endl;
    else if(HT[H0]==key)//若单元H0中元素的关键字为key，则查找成功
            cout<<"查找成功。"<<"在第"<<H0+1<<"位置。"<<"比较次数："<<cnt<<endl;
        else{
            Hi=Linedetect(HT,H0,key,cnt);
            //Hi=Seconddetect(HT,H0,key,cnt);
            if(HT[Hi]==key)//若单元Hi中元素的关键字为key，则查找成功
                cout<<"查找成功。"<<"在第"<<Hi+1<<"位置。"<<"比较次数："<<cnt<<endl;
            else
            	cout<<"查找失败。"<<"比较次数："<<cnt<<endl;
        }
}

bool InsertHash(int HT[],int key){
    int H0=H(key); //根据哈希函数H（key）计算哈希地址
    int Hi=-1,cnt=1;
    if(HT[H0]==NULLKEY){//若H0为空
        HC[H0]=1; //统计比较次数
        HT[H0]=key;	//放入H0中 
        return 1;
    }
    else{
        Hi=Linedetect(HT,H0,key,cnt);//线性探测
        //Hi=Seconddetect(HT,H0,key,cnt);//二次探测
        if(Hi!=-1 && HT[Hi]==NULLKEY){//若Hi为空
            HC[Hi]=cnt;
            HT[Hi]=key;
            return 1;
        }
    }
    return 0;
}

void print(int HT[]){
    for(int i=0;i<m;i++)
        cout<<HT[i]<<"\t";
    cout<<endl;
}

int main(){
	int x;
	memset(HT,0,sizeof(HT));
	memset(HC,0,sizeof(HC));
	print(HT);
	cout<<"输入12个关键字，存入哈希表中："<<endl;
	for(int i=0;i<12;i++){
		cin>>x;
		if(!InsertHash(HT,x)){
		    cout<<"创建哈希表失败！"<<endl;
		    return 0;
		}
	}
	cout<<"输出哈希表："<<endl;
	print(HT);
	print(HC);
	cout<<"输入要查找的关键字"<<endl;
	cin>>x;
	SearchHash(HT,x);
    return 0;
}
//测试数据1：14 36 42 38 40 15 19 12 51 65 34 25
//测试数据2：14 36 42 38 40 15 19 12 51 65 34 18
