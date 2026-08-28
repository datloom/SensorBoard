# Sensorboard
## Description
This is the front-end of this project. It visualizes the back-end stream data.  
Users can receive stream data on the screen they are currently viewing on the map.  
The stream data was GeoJson data coming from robots. 

## Configuration
Users can use features such as trajectory prediction, aggregation, and object detection for the stream data.
This consists of two pages.

### 1. First page (index.html)

![image](https://user-images.githubusercontent.com/63496777/220049044-9bfc0e1c-901b-43b2-81f8-1a36b6560ba7.png)

You can go to second page by click photo logo ![image](https://user-images.githubusercontent.com/63496777/220621525-7ce620ce-9545-4f43-a017-1bcac4e15dc6.png)
on the top left.

#### Available features
- Visualize **raw data** of this area (viewed on a map)
- Visualize **trajectory** prediction of the raw data
- Visualize **aggregation** results of the raw data

#### Details
- When you load raw data, the **stream name** will be saved in local storage to use it at page 2.

### 2. Second page (two.html)

![image](https://user-images.githubusercontent.com/63496777/220620267-43174291-504a-43ec-a15a-2b4189bb73f1.png)

You can go back to first page by click map logo ![image](https://user-images.githubusercontent.com/63496777/220621645-8acc155b-6e2f-4db7-a789-156a85237e3c.png)
 on the top left.

#### Available features
- Do **object detection** with raw data
- Show **image** and **chart** for object detection results
#### Details
- After you load data, if you **click layer** from left layer list, you can see image and chart for object detection results.

 
## About Project
The existing prototype of sensorboard only showed the selected stream data on the map.  
The main task was to modify the already developed front-end prototype and add the features as mentioned above.  
I mainly used the [**deck.gl**](https://deck.gl/) library for data visualization.  

The backend was developed by the internship team using Kafka, Ksql, and Torchserve.  
Java Spring bridge server was also used to connect the backend to the front end.

 
<!--
docker exec -it ksqldb-cli ksql http://ksqldb-server:8088 

Run Torchserve
> PowerShell Administrator
cd C:\Users\DPRT\Documents\pnu-geoai-main\torchserve_model_files\
torchserve.exe --start --ncs --model-store .\model_store_old\ --models TFK.mar

Run sensorboard_API (Spring)
java -jar C:\Users\DPRT\Documents\senosrboard_api\build\libs\senosrboard_api-0.0.1-SNAPSHOT.jar

## ros
You can use Ros system to reenact real-word data with overall systems.

following comands are examples of how to use.
```
//start main engine
1. $ roscore 
2. $ rosrun ros_kafka {python file} {topic name} 
. /home/dprt/workspace/catkin_ws/devel/setup.bash
rosrun ros_kafka kafka_publisher_featurecollection.py point_topic

3. $ rosbag play rosbag.bag
e.g. rosbag play ~/home/dprt/workspace/rosbag/*.bag
 -->